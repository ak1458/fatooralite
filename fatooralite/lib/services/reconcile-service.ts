import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { getActiveCertificate } from "@/lib/db/repo";
import { ZatcaClient } from "@/lib/zatca/client";
import type { ZatcaSubmitter } from "@/lib/zatca/client";
import {
  performSubmission,
  recordSubmissionFailure,
  buildInput,
  STALE_SUBMISSION_MS,
} from "./clearance-service";

export interface ReconcileResult {
  scanned: number;
  resubmitted: number;
  flagged: number;
  errors: number;
}

export interface ReconcileOptions {
  now?: Date;
  limit?: number;
  /** Injected gateway for tests; production builds one per invoice from its own certificate. */
  submitter?: ZatcaSubmitter;
}

/**
 * Find invoices stranded in "submitted" — a manual clear or the reporting
 * cron that crashed, timed out, or was killed after the gateway responded but
 * before the verdict was persisted — and either resend the identical signed
 * payload (unchanged uuid/hash, so ZATCA sees the same document) or, past the
 * retry ceiling, flag for manual review.
 *
 * Never guesses a verdict: a row this touches stays "submitted" unless a real
 * gateway response is received. ZATCA exposes no status-lookup endpoint, so
 * "reconcile" can only mean "resend the identical document" or "stop and ask
 * a human" — never "assume".
 */
export async function reconcileStuckSubmissions(
  opts: ReconcileOptions = {},
  db: PrismaClient = defaultDb,
): Promise<ReconcileResult> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 25;
  const cutoff = new Date(now.getTime() - STALE_SUBMISSION_MS);

  const candidates = await db.invoice.findMany({
    where: {
      status: "submitted",
      needsReview: false,
      OR: [{ lastSubmitAt: null }, { lastSubmitAt: { lt: cutoff } }],
      AND: [{ OR: [{ nextSubmitAt: null }, { nextSubmitAt: { lte: now } }] }],
    },
    orderBy: { lastSubmitAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const result: ReconcileResult = { scanned: candidates.length, resubmitted: 0, flagged: 0, errors: 0 };

  for (const c of candidates) {
    try {
      const outcome = await reconcileOne(c.id, now, cutoff, opts.submitter, db);
      if (outcome === "resolved") result.resubmitted++;
      else if (outcome === "flagged") result.flagged++;
      // "skipped" — lost the claim race to another invocation, or will retry
      // on a later tick per backoff. Not an error.
    } catch {
      result.errors++;
    }
  }

  return result;
}

async function wasFlagged(invoiceId: string, db: PrismaClient): Promise<boolean> {
  const row = await db.invoice.findUnique({ where: { id: invoiceId }, select: { needsReview: true } });
  return row?.needsReview ?? false;
}

async function reconcileOne(
  invoiceId: string,
  now: Date,
  cutoff: Date,
  submitter: ZatcaSubmitter | undefined,
  db: PrismaClient,
): Promise<"resolved" | "flagged" | "skipped"> {
  // Re-claim atomically: only a row still "submitted", still stale past the
  // cutoff, and not already flagged is claimed. The same compare-and-swap
  // submitInvoice uses for its first claim — it is what lets an overlapping
  // reconciler tick (a retried cron invocation, a manual trigger racing the
  // scheduled one) run safely without two invocations resending the same
  // invoice at once.
  const claim = await db.invoice.updateMany({
    where: {
      id: invoiceId,
      status: "submitted",
      needsReview: false,
      OR: [{ lastSubmitAt: null }, { lastSubmitAt: { lt: cutoff } }],
    },
    data: { lastSubmitAt: now, submitAttempts: { increment: 1 } },
  });
  if (claim.count === 0) return "skipped";

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true, company: true } });
  // Defensive only: a "submitted" row is always signed (submitInvoice never
  // claims an unsigned one), and can't disappear mid-reconcile.
  if (!invoice || !invoice.signedXml || !invoice.hash) return "skipped";

  const attemptNumber = invoice.submitAttempts;

  let client = submitter;
  if (!client) {
    const cert = await getActiveCertificate(invoice.companyId, db);
    if (!cert?.token || !cert.secret || cert.secret === "LOCAL-DEV-SECRET") {
      // Can't reach the gateway at all right now (certificate revoked/rotated
      // out from under a stranded invoice). Treat exactly like a failed
      // attempt so the backoff ladder and ceiling still apply.
      await recordSubmissionFailure(
        invoiceId,
        invoice.companyId,
        attemptNumber,
        new Error("no active ZATCA credentials available for reconciliation"),
        db,
      );
      return (await wasFlagged(invoiceId, db)) ? "flagged" : "skipped";
    }
    client = new ZatcaClient({ token: cert.token, secret: cert.secret });
  }

  try {
    await performSubmission(
      {
        invoiceId,
        companyId: invoice.companyId,
        uuid: invoice.uuid,
        hash: invoice.hash,
        signedXml: invoice.signedXml,
        input: buildInput(invoice),
      },
      attemptNumber,
      client,
      db,
    );
    return "resolved";
  } catch {
    // performSubmission already recorded the failure (backoff or, past the
    // ceiling, needsReview) before rethrowing.
    return (await wasFlagged(invoiceId, db)) ? "flagged" : "skipped";
  }
}

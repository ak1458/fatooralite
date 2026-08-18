import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { addClearanceRecord, addAuditEntry, getActiveCertificate } from "@/lib/db/repo";
import type { Prisma } from "@prisma/client";
import { num } from "@/lib/db/decimal";
import { ZatcaClient } from "@/lib/zatca/client";
import type { ZatcaResponse, ZatcaSubmitter } from "@/lib/zatca/client";
import type { InvoiceInput } from "@/lib/zatca/types";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found");
    this.name = "InvoiceNotFoundError";
  }
}
export class InvoiceNotSignedError extends Error {
  constructor() {
    super("Invoice must be signed before submission");
    this.name = "InvoiceNotSignedError";
  }
}
export class NoCredentialsError extends Error {
  constructor() {
    super("No active production certificate with ZATCA credentials");
    this.name = "NoCredentialsError";
  }
}
export class LocalCertificateSubmitError extends Error {
  constructor() {
    super("Invoices signed with local development certificates cannot be cleared on ZATCA. Connect real ZATCA in Integration settings first.");
    this.name = "LocalCertificateSubmitError";
  }
}
export class AlreadySubmittedError extends Error {
  constructor(public readonly status: string) {
    super(`Invoice is already ${status} — submitting again would resend it to the live ZATCA gateway.`);
    this.name = "AlreadySubmittedError";
  }
}
/**
 * The invoice is mid-flight: a previous call claimed it (status="submitted")
 * and its gateway fate is still unknown. Resubmitting here — outside the
 * reconciler's staleness/backoff rules — risks a second live ZATCA call for
 * the same document, so this path always refuses rather than guessing.
 */
export class SubmissionInFlightError extends Error {
  constructor() {
    super(
      "Invoice submission is already in flight (status: submitted) — its ZATCA fate is unknown. " +
        "It will be reconciled automatically; resubmitting now could send it to ZATCA twice.",
    );
    this.name = "SubmissionInFlightError";
  }
}

export interface SubmitResult {
  invoiceId: string;
  status: string; // resulting invoice status
  response: ZatcaResponse;
}

/** Retry/backoff policy shared by submitInvoice's failure path and the reconciler. */
export const MAX_SUBMIT_ATTEMPTS = 5;
/** Backoff ladder, indexed by (attempt number - 1), clamped to the last entry beyond that. */
export const RETRY_BACKOFF_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000, 4 * 60 * 60_000];
/**
 * How long a "submitted" row must sit untouched before the reconciler will
 * touch it — comfortably above the 30s gateway timeout plus the 60s route
 * budget, so it never races a request that is still genuinely in flight.
 */
export const STALE_SUBMISSION_MS = 10 * 60_000;

function backoffFor(attemptNumber: number): number {
  const idx = Math.min(attemptNumber, RETRY_BACKOFF_MS.length) - 1;
  return RETRY_BACKOFF_MS[Math.max(idx, 0)];
}

interface SubmissionContext {
  invoiceId: string;
  companyId: string;
  uuid: string;
  hash: string;
  signedXml: string;
  input: InvoiceInput;
}

export function buildInput(invoice: {
  invoiceNumber: string;
  kind: string;
  issueDate: string;
  issueTime: string;
  company: { name: string; vatNumber: string };
  buyerName: string | null;
  buyerVat: string | null;
  lines: { description: string; quantity: number; unitPrice: Prisma.Decimal | number; vatRate: number }[];
}): InvoiceInput {
  return {
    invoiceNumber: invoice.invoiceNumber,
    kind: invoice.kind as InvoiceInput["kind"],
    issueDate: invoice.issueDate,
    issueTime: invoice.issueTime,
    seller: { name: invoice.company.name, vatNumber: invoice.company.vatNumber },
    buyer: invoice.buyerName
      ? { name: invoice.buyerName, vatNumber: invoice.buyerVat ?? undefined }
      : undefined,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: num(l.unitPrice),
      vatRate: l.vatRate,
    })),
  };
}

/**
 * Record a failed gateway attempt (timeout/network/thrown error — never a
 * gateway-returned rejection, which is a normal verdict handled elsewhere).
 * Schedules the next automatic retry per the backoff ladder, or — past the
 * attempt ceiling — sets `needsReview` and stops automatic retries. Never
 * writes a status other than leaving it at "submitted": no gateway response
 * was ever received, so neither "rejected" nor "cleared"/"reported" is true.
 */
export async function recordSubmissionFailure(
  invoiceId: string,
  companyId: string,
  attemptNumber: number,
  err: unknown,
  db: PrismaClient,
): Promise<void> {
  const exhausted = attemptNumber >= MAX_SUBMIT_ATTEMPTS;
  const message = err instanceof Error ? err.message : String(err);

  await db.invoice.update({
    where: { id: invoiceId },
    data: exhausted
      ? { needsReview: true, nextSubmitAt: null }
      : { nextSubmitAt: new Date(Date.now() + backoffFor(attemptNumber)) },
  });

  await addAuditEntry({
    invoiceId,
    kind: "event",
    payload: JSON.stringify({ event: "submission_failed", attempt: attemptNumber, exhausted, message: message.slice(0, 300) }),
  }, db);

  await recordSecurityEvent({
    action: exhausted ? SECURITY_EVENTS.zatcaSubmissionExhausted : SECURITY_EVENTS.zatcaSubmissionRetried,
    outcome: "failure",
    companyId,
    targetType: "invoice",
    targetId: invoiceId,
    metadata: { attempt: attemptNumber, exhausted },
  }, db);
}

/**
 * Call the gateway and persist the verdict. Shared by `submitInvoice` (fresh
 * claim) and the reconciler (re-claim of a stale "submitted" row) so the
 * verdict-persistence logic — the part that must never diverge — exists once.
 */
export async function performSubmission(
  ctx: SubmissionContext,
  attemptNumber: number,
  client: ZatcaSubmitter,
  db: PrismaClient,
): Promise<SubmitResult> {
  let response: ZatcaResponse;
  try {
    response = await client.submit({
      input: ctx.input,
      uuid: ctx.uuid,
      signedXmlBase64: Buffer.from(ctx.signedXml, "utf8").toString("base64"),
      hash: ctx.hash,
    });
  } catch (err) {
    await recordSubmissionFailure(ctx.invoiceId, ctx.companyId, attemptNumber, err, db);
    throw err;
  }

  const newStatus =
    response.status === "accepted"
      ? response.action === "clearance"
        ? "cleared"
        : "reported"
      : "rejected";

  // Persist the verdict atomically. These were four sequential writes, so a
  // failure between them could leave a ClearanceRecord reading "accepted" beside
  // an invoice still reading "submitted" — a state nothing could explain later.
  await db.$transaction(async (tx) => {
    const txDb = tx as unknown as PrismaClient;
    await addClearanceRecord(
      {
        invoiceId: ctx.invoiceId,
        action: response.action,
        status: response.status,
        responseCode: response.code,
        message: response.message,
        rawResponse: response.raw,
      },
      txDb,
    );
    await addAuditEntry({ invoiceId: ctx.invoiceId, kind: "apiResponse", payload: response.raw }, txDb);
    await txDb.invoice.update({
      where: { id: ctx.invoiceId },
      data: {
        status: newStatus,
        resultCode: response.status === "rejected" ? response.code : null,
        nextSubmitAt: null,
        needsReview: false,
      },
    });

    // Keep the B2C reporting queue in sync whether this ran from the cron or a
    // manual submit: a reported simplified invoice leaves the pending queue.
    if (response.action === "reporting") {
      await txDb.invoice.update({
        where: { id: ctx.invoiceId },
        data: { reportingState: response.status === "accepted" ? "reported" : "failed" },
      });
    }
  });

  return { invoiceId: ctx.invoiceId, status: newStatus, response };
}

/**
 * Submit a signed invoice to ZATCA (clearance for standard, reporting for
 * simplified), persist the gateway record + audit entry, and update the
 * invoice status. The ZATCA mode (simulation/sandbox/production) is decided by
 * the injected client (defaults to env ZATCA_MODE / simulation).
 */
export async function submitInvoice(
  invoiceId: string,
  submitter?: ZatcaSubmitter,
  db: PrismaClient = defaultDb,
): Promise<SubmitResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true, company: true },
  });
  if (!invoice) throw new InvoiceNotFoundError();
  if (!invoice.signedXml || !invoice.hash) throw new InvoiceNotSignedError();
  // Guard against re-submitting an already-cleared/reported invoice — a
  // double-click, a retried network request, or (previously) the IDOR fixed
  // in lib/auth/server.ts could otherwise resubmit the same invoice to the
  // live ZATCA gateway repeatedly, each time appending another
  // clearanceRecord/audit row and risking a duplicate-submission flag on
  // ZATCA's side.
  if (invoice.status === "cleared" || invoice.status === "reported") {
    throw new AlreadySubmittedError(invoice.status);
  }

  // Build the real ZATCA client from the company's production credentials
  // unless a submitter was injected (tests). Do this BEFORE claiming the
  // invoice: a missing-credentials/local-cert error is a local configuration
  // problem, not a gateway call, and must never leave the invoice sitting in
  // "submitted" — that state means "sent to ZATCA, fate unknown", which this
  // is not.
  let client = submitter;
  if (!client) {
    const cert = await getActiveCertificate(invoice.companyId, db);
    if (!cert?.token || !cert.secret) throw new NoCredentialsError();
    if (cert.secret === "LOCAL-DEV-SECRET") {
      throw new LocalCertificateSubmitError();
    }
    client = new ZatcaClient({ token: cert.token, secret: cert.secret });
  }

  // Atomically claim the invoice: only "signed" or "rejected" (a prior
  // definitive gateway rejection, resubmit allowed) may become "submitted".
  // This single-statement UPDATE ... WHERE is the entire concurrency story —
  // two callers racing on the same invoice both read a claimable status above,
  // but at most one of the two UPDATEs here matches a row, because Postgres
  // serializes the two statements against each other. The loser sees
  // count === 0 and must not touch the gateway. A long-held row lock across
  // the gateway call (SELECT ... FOR UPDATE) was deliberately avoided: it
  // would have to be held across a call that can take up to 30s, well past
  // what's safe to hold a transaction open for on Neon's pooled connection.
  const claim = await db.invoice.updateMany({
    where: { id: invoiceId, status: { in: ["signed", "rejected"] } },
    data: { status: "submitted", submitAttempts: { increment: 1 }, lastSubmitAt: new Date(), nextSubmitAt: null, needsReview: false },
  });
  if (claim.count === 0) {
    const now = await db.invoice.findUnique({ where: { id: invoiceId }, select: { status: true } });
    if (now?.status === "cleared" || now?.status === "reported") {
      throw new AlreadySubmittedError(now.status);
    }
    // status is "submitted" (or the row vanished, which findUnique above
    // would have caught earlier) — another caller holds the claim.
    throw new SubmissionInFlightError();
  }

  const claimed = await db.invoice.findUnique({ where: { id: invoiceId }, select: { submitAttempts: true } });
  const attemptNumber = claimed?.submitAttempts ?? invoice.submitAttempts + 1;

  return performSubmission(
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
}

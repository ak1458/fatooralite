import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { STALE_SUBMISSION_MS } from "./clearance-service";

/**
 * Visibility into the background-work state machine (Phase 3 / W8).
 *
 * There is no separate job queue/table — the two crons
 * (zatca-reporting, zatca-reconcile) operate directly on Invoice rows via
 * the atomic-claim + backoff-ladder + terminal-review pattern built in
 * Phase 2 / W3 (see docs/02-architecture.md "Background work"). What was
 * genuinely missing was a way for an operator to SEE that state — an
 * invoice that hit the retry ceiling was invisible to everyone. This is
 * that read surface, consumed by /api/health/deep.
 */
export interface JobStats {
  /** kind:"simplified" invoices still waiting for the reporting cron. */
  reportingPending: number;
  /** Of those, past their 24h ZATCA reporting deadline. */
  reportingOverdue: number;
  /** Reporting attempts that reached a definitive gateway rejection. */
  reportingFailed: number;
  /** status:"submitted" longer than the reconciler's staleness window — mid-flight or awaiting the next reconcile tick. */
  submittedStale: number;
  /** Retry ceiling reached — fate unknown, stopped auto-retrying, needs a human decision. */
  needsReview: number;
}

export async function getJobStats(db: PrismaClient = defaultDb): Promise<JobStats> {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_SUBMISSION_MS);

  const [reportingPending, reportingOverdue, reportingFailed, submittedStale, needsReview] = await Promise.all([
    db.invoice.count({ where: { kind: "simplified", reportingState: "pending" } }),
    db.invoice.count({ where: { kind: "simplified", reportingState: "pending", reportingDeadline: { lt: now } } }),
    db.invoice.count({ where: { kind: "simplified", reportingState: "failed" } }),
    db.invoice.count({ where: { status: "submitted", needsReview: false, lastSubmitAt: { lt: staleCutoff } } }),
    db.invoice.count({ where: { needsReview: true } }),
  ]);

  return { reportingPending, reportingOverdue, reportingFailed, submittedStale, needsReview };
}

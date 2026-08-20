// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { getJobStats, type JobStats } from "./job-stats";
import { STALE_SUBMISSION_MS } from "./clearance-service";

/**
 * getJobStats is a global, cross-tenant operator view by design (it backs
 * the CRON_SECRET-gated /api/health/deep, not a tenant-scoped API) — so
 * this shared test database may hold rows from other test files at the
 * same time. Assert on the DELTA this test's own fixtures cause, never on
 * an absolute count.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000807";
let counter = 0;

async function makeInvoice(overrides: Record<string, unknown>) {
  const n = `JOB-${++counter}`;
  return db.invoice.create({
    data: {
      companyId, invoiceNumber: n, uuid: `${n}-${companyId}`, kind: "standard",
      status: "draft", issueDate: "2026-08-12", issueTime: "10:00:00",
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
      ...overrides,
    },
  });
}

function delta(before: JobStats, after: JobStats): JobStats {
  return {
    reportingPending: after.reportingPending - before.reportingPending,
    reportingOverdue: after.reportingOverdue - before.reportingOverdue,
    reportingFailed: after.reportingFailed - before.reportingFailed,
    submittedStale: after.submittedStale - before.submittedStale,
    needsReview: after.needsReview - before.needsReview,
  };
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const c = await db.company.create({ data: { name: "Job Stats Co", vatNumber: VAT } });
  companyId = c.id;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("getJobStats", () => {
  it("counts each background-work state independently and correctly", async () => {
    const before = await getJobStats(db);

    // pending, not yet overdue
    await makeInvoice({ kind: "simplified", reportingState: "pending", reportingDeadline: new Date(Date.now() + 3600_000) });
    // pending and overdue
    await makeInvoice({ kind: "simplified", reportingState: "pending", reportingDeadline: new Date(Date.now() - 3600_000) });
    // definitively failed
    await makeInvoice({ kind: "simplified", reportingState: "failed" });
    // stuck in submitted, stale
    await makeInvoice({ status: "submitted", lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000) });
    // stuck in submitted, but fresh — not yet reconciler-eligible, must not count as stale
    await makeInvoice({ status: "submitted", lastSubmitAt: new Date() });
    // needs review (retry ceiling hit) — also stale, but must count once, as needsReview only
    await makeInvoice({ status: "submitted", needsReview: true, lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000) });

    const after = await getJobStats(db);
    const d = delta(before, after);

    expect(d.reportingPending).toBe(2);
    expect(d.reportingOverdue).toBe(1);
    expect(d.reportingFailed).toBe(1);
    expect(d.submittedStale).toBe(1); // the needsReview row is excluded — terminal, not reconciler-eligible
    expect(d.needsReview).toBe(1);
  }, 20_000);
});

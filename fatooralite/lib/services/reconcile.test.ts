// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { reconcileStuckSubmissions } from "./reconcile-service";
import { MAX_SUBMIT_ATTEMPTS, STALE_SUBMISSION_MS } from "./clearance-service";
import type { ZatcaSubmitter, ZatcaResponse } from "@/lib/zatca/client";

/**
 * The reconciler is the answer to "the app died (or the gateway timed out)
 * after claiming an invoice as submitted, and nothing ever resolved it."
 * ZATCA has no status-lookup endpoint, so every scenario here ends in exactly
 * one of two honest outcomes: the identical signed payload gets resent, or —
 * past the retry ceiling — the row is flagged for a human. Never a guessed
 * verdict.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000804";

function acceptingGateway() {
  const calls: string[] = [];
  const submitter: ZatcaSubmitter = {
    actionFor: () => "clearance",
    async submit(args): Promise<ZatcaResponse> {
      calls.push(args.uuid);
      return {
        action: "clearance", status: "accepted", code: "CLEARED",
        message: "Accepted by ZATCA", raw: JSON.stringify({ clearanceStatus: "CLEARED" }),
      };
    },
  };
  return { submitter, calls };
}

function alwaysThrowingGateway() {
  let calls = 0;
  const submitter: ZatcaSubmitter = {
    actionFor: () => "clearance",
    async submit(): Promise<ZatcaResponse> {
      calls++;
      throw new Error("gateway unreachable");
    },
  };
  return { submitter, get calls() { return calls; } };
}

let counter = 0;
async function makeStuckInvoice(overrides: {
  lastSubmitAt: Date | null;
  submitAttempts?: number;
  nextSubmitAt?: Date | null;
  needsReview?: boolean;
}) {
  const n = `RECON-${++counter}`;
  return db.invoice.create({
    data: {
      companyId, invoiceNumber: n, uuid: `${n}-${companyId}`, kind: "standard",
      status: "submitted", issueDate: "2026-08-12", issueTime: "10:00:00",
      signedXml: "<Invoice/>", hash: `hash-${n}`,
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
      submitAttempts: overrides.submitAttempts ?? 1,
      lastSubmitAt: overrides.lastSubmitAt,
      nextSubmitAt: overrides.nextSubmitAt ?? null,
      needsReview: overrides.needsReview ?? false,
      lines: { create: [{ description: "l", quantity: 1, unitPrice: 100, vatRate: 0.15, netAmount: 100, vatAmount: 15 }] },
    },
  });
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const c = await db.company.create({ data: { name: "Reconcile Co", vatNumber: VAT } });
  companyId = c.id;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("reconcileStuckSubmissions", () => {
  it("resolves a stranded submission — crash after acceptance, before persistence (scenario 7)", async () => {
    const inv = await makeStuckInvoice({ lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000) });
    const g = acceptingGateway();

    const result = await reconcileStuckSubmissions({ submitter: g.submitter }, db);

    expect(result.resubmitted).toBeGreaterThanOrEqual(1);
    expect(g.calls).toEqual([inv.uuid]); // identical uuid — same document, not a new one

    const after = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(after?.status).toBe("cleared");
    expect(after?.hash).toBe(inv.hash);
    const records = await db.clearanceRecord.findMany({ where: { invoiceId: inv.id } });
    expect(records).toHaveLength(1);
  });

  it("does not touch a submission that isn't stale yet (scenario 8b: not eligible)", async () => {
    const inv = await makeStuckInvoice({ lastSubmitAt: new Date() }); // just claimed, well inside the staleness window
    const g = acceptingGateway();

    const result = await reconcileStuckSubmissions({ submitter: g.submitter, limit: 100 }, db);

    expect(g.calls).toHaveLength(0);
    const after = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
    expect(after?.status).toBe("submitted");
    void result;
  });

  it("respects the backoff window, then becomes eligible once it passes (scenario 9: repeated retries)", async () => {
    const stale = new Date(Date.now() - STALE_SUBMISSION_MS - 1000);
    const cooldownUntil = new Date(Date.now() + 60 * 60_000); // 1h in the future
    const inv = await makeStuckInvoice({ lastSubmitAt: stale, nextSubmitAt: cooldownUntil });
    const g = acceptingGateway();

    // Still cooling down "now" — must not be touched.
    const soon = await reconcileStuckSubmissions({ submitter: g.submitter, now: new Date() }, db);
    expect(g.calls).toHaveLength(0);
    expect(soon.resubmitted).toBe(0);

    // After the backoff window passes, it becomes eligible. A far-future
    // `now` also makes other tests' leftover rows in this shared company
    // look eligible (a real reconciler sweeps every tenant's stuck
    // invoices — that's correct, not a bug) so assert on this invoice's own
    // outcome rather than an exact gateway call count.
    const later = await reconcileStuckSubmissions(
      { submitter: g.submitter, now: new Date(cooldownUntil.getTime() + 1000) },
      db,
    );
    expect(g.calls).toContain(inv.uuid);
    expect(later.resubmitted).toBeGreaterThanOrEqual(1);
    const after = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
    expect(after?.status).toBe("cleared");
  });

  it("flags for review at the retry ceiling instead of retrying forever, and audits it (scenario 10: max retries reached)", async () => {
    const inv = await makeStuckInvoice({
      lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000),
      submitAttempts: MAX_SUBMIT_ATTEMPTS - 1, // this attempt will be the ceiling-hitting one
    });
    const g = alwaysThrowingGateway();

    const result = await reconcileStuckSubmissions({ submitter: g.submitter }, db);
    expect(result.flagged).toBeGreaterThanOrEqual(1);
    expect(g.calls).toBe(1);

    const after = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(after?.needsReview).toBe(true);
    expect(after?.status).toBe("submitted"); // never guessed as rejected
    expect(after?.submitAttempts).toBe(MAX_SUBMIT_ATTEMPTS);

    const events = await db.securityEvent.findMany({ where: { targetId: inv.id, action: "zatca.submission.exhausted" } });
    expect(events.length).toBeGreaterThanOrEqual(1);

    // A flagged row is never picked up again automatically.
    const again = await reconcileStuckSubmissions({ submitter: g.submitter }, db);
    expect(again.scanned).toBe(0);
    expect(g.calls).toBe(1); // unchanged — no second gateway call
  });

  it("leaves a still-failing submission stranded honestly, with backoff advanced and no forged verdict (scenario 11: reconciliation after restart)", async () => {
    const inv = await makeStuckInvoice({ lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000) });
    const g = alwaysThrowingGateway();

    const result = await reconcileStuckSubmissions({ submitter: g.submitter }, db);
    expect(result.resubmitted).toBe(0);
    expect(result.errors).toBe(0); // a recorded failure is not a reconciler error

    const after = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(after?.status).toBe("submitted"); // no fabricated cleared/rejected verdict
    expect(after?.needsReview).toBe(false); // below the ceiling — still eligible later
    expect(after?.nextSubmitAt).not.toBeNull();
    expect(after?.hash).toBe(inv.hash);
    expect(after?.uuid).toBe(inv.uuid);
  });

  it("two overlapping reconciler ticks never resend the same invoice twice", async () => {
    const inv = await makeStuckInvoice({ lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000) });
    let releaseGateway!: () => void;
    const gate = new Promise<void>((resolve) => { releaseGateway = resolve; });
    let calls = 0;
    const slow: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(args): Promise<ZatcaResponse> {
        calls++;
        await gate;
        return {
          action: "clearance", status: "accepted", code: "CLEARED",
          message: "Accepted by ZATCA", raw: JSON.stringify({ clearanceStatus: "CLEARED", uuid: args.uuid }),
        };
      },
    };

    const first = reconcileStuckSubmissions({ submitter: slow }, db);
    await new Promise((r) => setTimeout(r, 50));
    const second = reconcileStuckSubmissions({ submitter: slow }, db);

    releaseGateway();
    const [r1, r2] = await Promise.all([first, second]);

    expect(calls).toBe(1);
    expect(r1.resubmitted + r2.resubmitted).toBe(1);

    const records = await db.clearanceRecord.findMany({ where: { invoiceId: inv.id } });
    expect(records).toHaveLength(1);
  });
});

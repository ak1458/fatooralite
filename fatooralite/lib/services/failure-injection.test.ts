// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { submitInvoice } from "./clearance-service";
import { reconcileStuckSubmissions } from "./reconcile-service";
import { scriptedSubmitter, submitterFailingNTimes, faultyDb } from "@/lib/testing/faults";
import { STALE_SUBMISSION_MS } from "./clearance-service";

/**
 * Phase 3 / W16 — controlled failure injection using the shared helpers in
 * lib/testing/faults.ts, covering scenarios not already exercised by Phase
 * 2's clearance-crash.test.ts / reconcile.test.ts (which already cover
 * gateway timeout/network/reject directly): a DB failure at the CAS-claim
 * step itself, and repeated-then-recovering gateway failures.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000843";
let n = 0;

async function makeSignedInvoice() {
  const inv = `FI-${++n}`;
  return db.invoice.create({
    data: {
      companyId, invoiceNumber: inv, uuid: `${inv}-${companyId}`, kind: "standard",
      status: "signed", issueDate: "2026-08-12", issueTime: "10:00:00",
      signedXml: "<Invoice/>", hash: `hash-${inv}`,
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
    },
  });
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const c = await db.company.create({ data: { name: "Fault Injection Co", vatNumber: VAT } });
  companyId = c.id;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("failure injection (W16)", () => {
  it("a DB failure at the claim step never reaches the gateway, and the invoice stays unclaimed for a later retry", async () => {
    const inv = await makeSignedInvoice();
    const { submitter, calls } = scriptedSubmitter([{ kind: "accept" }]);

    // Fail exactly the updateMany call the CAS claim uses.
    const brokenDb = faultyDb(db, { model: "invoice", action: "updateMany", failTimes: 1, error: new Error("simulated connection drop") });

    await expect(submitInvoice(inv.id, submitter, brokenDb)).rejects.toThrow(/simulated connection drop/);
    expect(calls).toHaveLength(0); // never reached the gateway

    // The row is untouched — still "signed", claimable by a genuine retry
    // (using the real, unbroken client this time).
    const after = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
    expect(after?.status).toBe("signed");

    const retry = await submitInvoice(inv.id, submitter, db);
    expect(retry.status).toBe("cleared");
    expect(calls).toHaveLength(1);
  }, 20_000);

  it("repeated gateway failures followed by recovery: the reconciler eventually resolves without ever fabricating a verdict", async () => {
    const inv = await db.invoice.create({
      data: {
        companyId, invoiceNumber: `FI-${++n}`, uuid: `FI-recover-${companyId}`, kind: "standard",
        status: "submitted", issueDate: "2026-08-12", issueTime: "10:00:00",
        signedXml: "<Invoice/>", hash: "hash-recover",
        taxableAmount: 100, vatAmount: 15, grandTotal: 115,
        submitAttempts: 1,
        lastSubmitAt: new Date(Date.now() - STALE_SUBMISSION_MS - 1000),
      },
    });
    // Fails twice, then accepts — models a gateway that recovers.
    const { submitter, calls } = submitterFailingNTimes(2);

    // Tick 1: fails, schedules backoff, still "submitted" — no fabricated verdict.
    const r1 = await reconcileStuckSubmissions({ submitter, now: new Date() }, db);
    expect(r1.resubmitted).toBe(0);
    let row = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(row?.status).toBe("submitted");
    expect(row?.needsReview).toBe(false);
    expect(row?.nextSubmitAt).not.toBeNull();

    // Tick 2 (after the backoff window): fails again, still no verdict guessed.
    const r2 = await reconcileStuckSubmissions({ submitter, now: new Date(row!.nextSubmitAt!.getTime() + 1000) }, db);
    expect(r2.resubmitted).toBe(0);
    row = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(row?.status).toBe("submitted");

    // Tick 3 (gateway recovered): resolves.
    const r3 = await reconcileStuckSubmissions({ submitter, now: new Date(row!.nextSubmitAt!.getTime() + 1000) }, db);
    expect(r3.resubmitted).toBe(1);
    row = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(row?.status).toBe("cleared");
    expect(calls).toHaveLength(3);
    // Same document throughout — hash/uuid never changed across the retries.
    expect(calls.every((c) => c.uuid === "FI-recover-" + companyId)).toBe(true);
  }, 20_000);
});

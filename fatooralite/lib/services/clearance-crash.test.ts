// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { submitInvoice, SubmissionInFlightError } from "./clearance-service";
import type { ZatcaSubmitter, ZatcaResponse } from "@/lib/zatca/client";

/**
 * Addendum §3 / §16: "Submit to ZATCA → ZATCA accepts → the app dies before
 * recording the result." After a restart the system must not present the
 * invoice as never-sent, because the operator's only recourse then is to send
 * it again.
 *
 * Phase 2 / W3 extends this: the crash window is now closed by an atomic
 * compare-and-swap on the signed→submitted transition (concurrent callers,
 * or a retry while already "submitted", never reach the gateway twice), and
 * a gateway timeout/network failure schedules a backed-off retry instead of
 * leaving the row to be resent unconditionally.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000803";

/** A gateway that accepts, and counts how many times it was called. */
function countingGateway() {
  const calls: string[] = [];
  const submitter: ZatcaSubmitter = {
    actionFor: (kind) => (kind === "standard" ? "clearance" : "reporting"),
    async submit(args): Promise<ZatcaResponse> {
      calls.push(args.uuid);
      return {
        action: args.input.kind === "standard" ? "clearance" : "reporting",
        status: "accepted",
        code: "CLEARED",
        message: "Accepted by ZATCA",
        raw: JSON.stringify({ clearanceStatus: "CLEARED" }),
      };
    },
  };
  return { submitter, calls };
}

let counter = 0;
async function makeSignedInvoice() {
  const n = `CRASH-${++counter}`;
  return db.invoice.create({
    data: {
      companyId, invoiceNumber: n, uuid: `${n}-${companyId}`, kind: "standard",
      status: "signed", issueDate: "2026-08-12", issueTime: "10:00:00",
      signedXml: "<Invoice/>", hash: "abc123",
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
      lines: { create: [{ description: "l", quantity: 1, unitPrice: 100, vatRate: 0.15, netAmount: 100, vatAmount: 15 }] },
    },
  });
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const c = await db.company.create({ data: { name: "Crash Co", vatNumber: VAT } });
  companyId = c.id;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("ZATCA submission crash window", () => {
  it("marks the invoice as submitted BEFORE calling the gateway (scenario 1: submit once)", async () => {
    const inv = await makeSignedInvoice();
    const seen: string[] = [];
    const submitter: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(): Promise<ZatcaResponse> {
        // Observe what the database says at the moment the gateway is called.
        const mid = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
        seen.push(mid!.status);
        return {
          action: "clearance", status: "accepted", code: "CLEARED",
          message: "Accepted by ZATCA", raw: JSON.stringify({ clearanceStatus: "CLEARED" }),
        };
      },
    };
    const res = await submitInvoice(inv.id, submitter, db);
    // If the invoice is still "signed" while the request is in flight, a crash
    // here is indistinguishable from "never sent".
    expect(seen).toEqual(["submitted"]);
    expect(res.status).toBe("cleared");

    const after = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(after?.submitAttempts).toBe(1);
    expect(after?.needsReview).toBe(false);
    expect(after?.nextSubmitAt).toBeNull();
    // PIH/ICV-relevant identity is untouched by the reliability plumbing.
    expect(after?.uuid).toBe(inv.uuid);
    expect(after?.hash).toBe("abc123");
  });

  it("leaves an invoice in `submitted`, not `signed`, when the process dies mid-flight (scenario 6: crash during submission)", async () => {
    const inv = await makeSignedInvoice();
    const submitter: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(): Promise<ZatcaResponse> {
        // The gateway accepted, then the process died before anything could be
        // written back — modelled as a throw after the call.
        throw new Error("process killed after the gateway accepted");
      },
    };
    await expect(submitInvoice(inv.id, submitter, db)).rejects.toThrow();

    const after = await db.invoice.findUnique({ where: { id: inv.id } });
    expect(after?.status).toBe("submitted");
    expect(after?.status).not.toBe("signed");
    // The claim's pre-gateway-call write landed even though the call itself failed.
    expect(after?.submitAttempts).toBe(1);
    expect(after?.lastSubmitAt).not.toBeNull();
    // A failed attempt schedules a backoff retry rather than leaving the row
    // eligible for immediate resubmission.
    expect(after?.nextSubmitAt).not.toBeNull();
    expect(after?.needsReview).toBe(false);
  });

  it("does not silently resend an invoice already recorded as cleared (scenario 2: submit twice)", async () => {
    const inv = await makeSignedInvoice();
    const g1 = countingGateway();
    await submitInvoice(inv.id, g1.submitter, db);
    expect(g1.calls).toHaveLength(1);

    const g2 = countingGateway();
    await expect(submitInvoice(inv.id, g2.submitter, db)).rejects.toThrow(/already cleared/i);
    expect(g2.calls).toHaveLength(0);
  });

  it("records the gateway verdict and the invoice status together (scenario 1 continued)", async () => {
    const inv = await makeSignedInvoice();
    const g = countingGateway();
    const res = await submitInvoice(inv.id, g.submitter, db);
    expect(res.status).toBe("cleared");

    const [row, records] = await Promise.all([
      db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } }),
      db.clearanceRecord.findMany({ where: { invoiceId: inv.id } }),
    ]);
    // Either both landed or neither did — a ClearanceRecord saying "accepted"
    // beside an invoice still reading "submitted" is an unexplainable state.
    expect(row?.status).toBe("cleared");
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("accepted");
  });

  it("refuses a second caller while the first is still mid-flight, and never calls the gateway twice (scenario 3: concurrent submission)", async () => {
    const inv = await makeSignedInvoice();
    let releaseGateway!: () => void;
    const gate = new Promise<void>((resolve) => { releaseGateway = resolve; });
    let gatewayCalls = 0;
    const slowSubmitter: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(): Promise<ZatcaResponse> {
        gatewayCalls++;
        await gate;
        return {
          action: "clearance", status: "accepted", code: "CLEARED",
          message: "Accepted by ZATCA", raw: JSON.stringify({ clearanceStatus: "CLEARED" }),
        };
      },
    };

    const first = submitInvoice(inv.id, slowSubmitter, db);
    // Give the first call time to win the atomic claim before the second starts.
    await new Promise((r) => setTimeout(r, 50));
    const second = submitInvoice(inv.id, slowSubmitter, db);

    await expect(second).rejects.toThrow(SubmissionInFlightError);
    releaseGateway();
    const firstResult = await first;

    expect(firstResult.status).toBe("cleared");
    expect(gatewayCalls).toBe(1); // the loser never reached client.submit()

    const after = await db.invoice.findUnique({ where: { id: inv.id }, select: { submitAttempts: true } });
    expect(after?.submitAttempts).toBe(1);
  });

  it("schedules a backed-off retry on a gateway timeout, preserving uuid and hash for the eventual resend (scenarios 4/5: timeout after/before gateway receipt)", async () => {
    const inv = await makeSignedInvoice();
    const seenUuids: string[] = [];
    const timeoutSubmitter: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(args): Promise<ZatcaResponse> {
        seenUuids.push(args.uuid);
        const err = new Error("The operation was aborted");
        err.name = "TimeoutError";
        throw err;
      },
    };

    await expect(submitInvoice(inv.id, timeoutSubmitter, db)).rejects.toThrow(/aborted/i);

    const after = await db.invoice.findUnique({ where: { id: inv.id } });
    // Fate unknown — must stay "submitted", never guessed as rejected/cleared.
    expect(after?.status).toBe("submitted");
    expect(after?.submitAttempts).toBe(1);
    expect(after?.nextSubmitAt).not.toBeNull();
    expect(after?.needsReview).toBe(false);
    // The identity the reconciler will resend is exactly what was sent the
    // first time — this is what makes a later resend safe.
    expect(seenUuids[0]).toBe(inv.uuid);
    expect(after?.uuid).toBe(inv.uuid);
    expect(after?.hash).toBe(inv.hash);

    const auditRows = await db.auditEntry.findMany({ where: { invoiceId: inv.id, kind: "event" } });
    expect(auditRows.length).toBeGreaterThan(0);
  });

  it("refuses a direct resubmit while status is submitted, without touching the gateway (scenario 8a: retry after SUBMITTED)", async () => {
    const inv = await makeSignedInvoice();
    const failingOnce: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(): Promise<ZatcaResponse> {
        throw new Error("network failure");
      },
    };
    await expect(submitInvoice(inv.id, failingOnce, db)).rejects.toThrow(/network failure/);

    const stillSubmitted = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
    expect(stillSubmitted?.status).toBe("submitted");

    const g = countingGateway();
    await expect(submitInvoice(inv.id, g.submitter, db)).rejects.toThrow(SubmissionInFlightError);
    expect(g.calls).toHaveLength(0);
  });
});

// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { submitInvoice } from "./clearance-service";
import type { ZatcaSubmitter, ZatcaResponse } from "@/lib/zatca/client";

/**
 * Addendum §3 / §16: "Submit to ZATCA → ZATCA accepts → the app dies before
 * recording the result." After a restart the system must not present the
 * invoice as never-sent, because the operator's only recourse then is to send
 * it again.
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

async function makeSignedInvoice(n: string) {
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
  it("marks the invoice as submitted BEFORE calling the gateway", async () => {
    const inv = await makeSignedInvoice("CRASH-1");
    const seen: string[] = [];
    const submitter: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(args): Promise<ZatcaResponse> {
        // Observe what the database says at the moment the gateway is called.
        const mid = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
        seen.push(mid!.status);
        return {
          action: "clearance", status: "accepted", code: "CLEARED",
          message: "Accepted by ZATCA", raw: JSON.stringify({ clearanceStatus: "CLEARED" }),
          ...(args ? {} : {}),
        };
      },
    };
    await submitInvoice(inv.id, submitter, db);
    // If the invoice is still "signed" while the request is in flight, a crash
    // here is indistinguishable from "never sent".
    expect(seen).toEqual(["submitted"]);
  });

  it("leaves an invoice in `submitted`, not `signed`, when the process dies mid-flight", async () => {
    const inv = await makeSignedInvoice("CRASH-2");
    const submitter: ZatcaSubmitter = {
      actionFor: () => "clearance",
      async submit(): Promise<ZatcaResponse> {
        // The gateway accepted, then the process died before anything could be
        // written back — modelled as a throw after the call.
        throw new Error("process killed after the gateway accepted");
      },
    };
    await expect(submitInvoice(inv.id, submitter, db)).rejects.toThrow();

    const after = await db.invoice.findUnique({ where: { id: inv.id }, select: { status: true } });
    expect(after?.status).toBe("submitted");
    expect(after?.status).not.toBe("signed");
  });

  it("does not silently resend an invoice already recorded as cleared", async () => {
    const inv = await makeSignedInvoice("CRASH-3");
    const g1 = countingGateway();
    await submitInvoice(inv.id, g1.submitter, db);
    expect(g1.calls).toHaveLength(1);

    const g2 = countingGateway();
    await expect(submitInvoice(inv.id, g2.submitter, db)).rejects.toThrow(/already cleared/i);
    expect(g2.calls).toHaveLength(0);
  });

  it("records the gateway verdict and the invoice status together", async () => {
    const inv = await makeSignedInvoice("CRASH-4");
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
});

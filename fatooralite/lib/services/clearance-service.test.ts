import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, pushTestSchema, testClient } from "@/lib/db/test-db";
import { issueInvoice } from "./invoice-service";
import { submitInvoice } from "./clearance-service";
import type { ZatcaSubmitter, SubmitArgs } from "@/lib/zatca/client";
import { validateInvoice } from "@/lib/zatca/validate";
import { generateKeyPair } from "@/lib/zatca/index";
import type { InvoiceInput } from "@/lib/zatca/types";

let db: PrismaClient;
let companyId: string;

// Stub gateway: accepts valid invoices, rejects ones failing BR-KSA validation.
const client: ZatcaSubmitter = {
  actionFor: (kind) => (kind === "standard" ? "clearance" : "reporting"),
  submit: async (args: SubmitArgs) => {
    const action = args.input.kind === "standard" ? "clearance" : "reporting";
    const issue = validateInvoice(args.input);
    if (issue) {
      return { action, status: "rejected", code: issue.code, message: issue.message, raw: "{}" };
    }
    return { action, status: "accepted", code: "ACCEPTED", message: "ok", raw: "{}" };
  },
};

beforeAll(async () => {
  if (!hasTestDb) return;
  pushTestSchema();
  db = testClient();
  const kp = generateKeyPair();
  const company = await db.company.create({ data: { name: "Almarai", vatNumber: "311122334400003" } });
  companyId = company.id;
  await db.certificate.create({
    data: {
      companyId,
      kind: "production",
      status: "active",
      privateKey: kp.privateKeyPem,
      publicKey: kp.publicKeyPem,
      token: "test-token",
      secret: "test-secret",
    },
  });
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
});

const standard: InvoiceInput = {
  invoiceNumber: "INV-C-1",
  kind: "standard",
  issueDate: "2026-06-17",
  seller: { name: "Almarai", vatNumber: "311122334400003" },
  buyer: { name: "Tamimi", vatNumber: "300000000000003" },
  lines: [{ description: "Milk", quantity: 10, unitPrice: 12 }],
};

describe.skipIf(!hasTestDb)("submitInvoice", () => {
  it("clears a valid standard invoice and records it", async () => {
    const issued = await issueInvoice(companyId, standard, db);
    const res = await submitInvoice(issued.invoiceId, client, db);
    expect(res.status).toBe("cleared");
    expect(res.response.action).toBe("clearance");
    const records = await db.clearanceRecord.findMany({ where: { invoiceId: issued.invoiceId } });
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("accepted");
  });

  it("reports a simplified invoice", async () => {
    const issued = await issueInvoice(
      companyId,
      { ...standard, invoiceNumber: "INV-C-2", kind: "simplified", buyer: undefined },
      db,
    );
    const res = await submitInvoice(issued.invoiceId, client, db);
    expect(res.status).toBe("reported");
  });

  it("rejects a standard invoice missing the buyer VAT", async () => {
    const issued = await issueInvoice(
      companyId,
      { ...standard, invoiceNumber: "INV-C-3", buyer: { name: "Walkin" } },
      db,
    );
    const res = await submitInvoice(issued.invoiceId, client, db);
    expect(res.status).toBe("rejected");
    expect(res.response.code).toBe("BR-KSA-44");
    const row = await db.invoice.findUniqueOrThrow({ where: { id: issued.invoiceId } });
    expect(row.resultCode).toBe("BR-KSA-44");
  });
});

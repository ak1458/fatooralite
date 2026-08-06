import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { provisionLocalCertificate } from "./onboarding-service";
import { issueInvoice } from "./invoice-service";
import { getActiveCertificate } from "@/lib/db/repo";
import type { InvoiceInput } from "@/lib/zatca/types";

let db: PrismaClient;
const VAT = "300000000000045";

async function clean(c: PrismaClient) {
  const co = await c.company.findUnique({ where: { vatNumber: VAT } });
  if (co) {
    await c.invoice.deleteMany({ where: { companyId: co.id } });
    await c.certificate.deleteMany({ where: { companyId: co.id } });
    await c.company.delete({ where: { id: co.id } });
  }
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await clean(db);
}, 120_000);

afterAll(async () => {
  if (db) { await clean(db); await db.$disconnect(); }
});

describe.skipIf(!hasTestDb)("provisionLocalCertificate", () => {
  it("creates an active production certificate and is idempotent", async () => {
    const company = await db.company.create({ data: { name: "Cert Co", vatNumber: VAT } });

    const first = await provisionLocalCertificate(company.id, db);
    expect(first.created).toBe(true);

    const active = await getActiveCertificate(company.id, db);
    expect(active?.status).toBe("active");
    expect(active?.privateKey).toContain("PRIVATE KEY"); // decrypted PEM
    expect(active?.publicKey).toContain("PUBLIC KEY");

    const second = await provisionLocalCertificate(company.id, db);
    expect(second.created).toBe(false); // no duplicate active cert
  });

  it("lets issueInvoice sign an invoice end-to-end", async () => {
    const company = await db.company.findUnique({ where: { vatNumber: VAT } });
    const input: InvoiceInput = {
      invoiceNumber: "INV-CERT-1",
      kind: "simplified",
      issueDate: "2026-06-20",
      issueTime: "10:00:00",
      seller: { name: "Cert Co", vatNumber: VAT },
      lines: [{ description: "Item", quantity: 2, unitPrice: 50 }],
    };
    const result = await issueInvoice(company!.id, input, db);
    expect(result.status).toBe("signed");
    expect(result.signed.qr.length).toBeGreaterThan(20);
    expect(result.signed.hash.length).toBeGreaterThan(20);
    expect(result.signed.totals.grandTotal).toBe(115);
  }, 30_000);
});

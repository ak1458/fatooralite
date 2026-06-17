import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  createCompany,
  createInvoice,
  attachSignature,
  setInvoiceStatus,
  listInvoices,
  getLastInvoiceHash,
  addClearanceRecord,
  addAuditEntry,
  searchAudit,
} from "./repo";
import type { InvoiceInput } from "@/lib/zatca/types";

const dbFile = path.join(os.tmpdir(), `fl-test-${Date.now()}.db`).replace(/\\/g, "/");
const url = `file:${dbFile}`;
let db: PrismaClient;

beforeAll(() => {
  // Create the schema in a throwaway SQLite file.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  db = new PrismaClient({ datasourceUrl: url });
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

const input: InvoiceInput = {
  invoiceNumber: "INV-T-0001",
  kind: "standard",
  issueDate: "2026-06-17",
  seller: { name: "Almarai", vatNumber: "311122334400003" },
  lines: [{ description: "Milk", quantity: 10, unitPrice: 12 }],
};

describe("db repository", () => {
  it("creates a company and an invoice with lines + totals", async () => {
    const company = await createCompany(
      { name: "Almarai", vatNumber: "311122334400003" },
      db,
    );
    const invoice = await createInvoice({ companyId: company.id, input }, "uuid-t-1", db);
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.taxableAmount).toBe(120);
    expect(invoice.vatAmount).toBe(18);
    expect(invoice.grandTotal).toBe(138);
    expect(invoice.status).toBe("draft");
  });

  it("attaches signature, updates status, and chains the hash", async () => {
    const company = await createCompany(
      { name: "Jarir", vatNumber: "311122334400099" },
      db,
    );
    const inv = await createInvoice(
      { companyId: company.id, input: { ...input, invoiceNumber: "INV-T-0002" } },
      "uuid-t-2",
      db,
    );
    await attachSignature(
      inv.id,
      { xml: "<xml/>", hash: "HASH==", signature: "SIG==", qr: "QR==" },
      db,
    );
    expect(await getLastInvoiceHash(company.id, db)).toBe("HASH==");

    await setInvoiceStatus(inv.id, "cleared", null, db);
    const cleared = await listInvoices(company.id, { status: "cleared" }, db);
    expect(cleared).toHaveLength(1);
  });

  it("records clearance + audit entries and searches them", async () => {
    const company = await createCompany(
      { name: "Nahdi", vatNumber: "311122334400077" },
      db,
    );
    const inv = await createInvoice(
      { companyId: company.id, input: { ...input, invoiceNumber: "INV-T-0003" } },
      "uuid-t-3",
      db,
    );
    await addClearanceRecord(
      { invoiceId: inv.id, action: "clearance", status: "accepted", responseCode: "200" },
      db,
    );
    await addAuditEntry({ invoiceId: inv.id, kind: "xml", payload: "<xml/>" }, db);
    const found = await searchAudit({ invoiceId: inv.id, kind: "xml" }, db);
    expect(found).toHaveLength(1);
    expect(found[0].payload).toBe("<xml/>");
  });
});

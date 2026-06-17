import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { issueInvoice } from "./invoice-service";
import { submitInvoice } from "./clearance-service";
import { ZatcaClient } from "@/lib/zatca/client";
import { generateKeyPair } from "@/lib/zatca/index";
import type { InvoiceInput } from "@/lib/zatca/types";

const dbFile = path.join(os.tmpdir(), `fl-clr-${Date.now()}.db`).replace(/\\/g, "/");
const url = `file:${dbFile}`;
let db: PrismaClient;
let companyId: string;
const client = new ZatcaClient("simulation");

beforeAll(async () => {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  db = new PrismaClient({ datasourceUrl: url });
  const kp = generateKeyPair();
  const company = await db.company.create({ data: { name: "Almarai", vatNumber: "311122334400003" } });
  companyId = company.id;
  await db.certificate.create({
    data: { companyId, kind: "production", status: "active", privateKey: kp.privateKeyPem, certificate: kp.publicKeyPem },
  });
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

const standard: InvoiceInput = {
  invoiceNumber: "INV-C-1",
  kind: "standard",
  issueDate: "2026-06-17",
  seller: { name: "Almarai", vatNumber: "311122334400003" },
  buyer: { name: "Tamimi", vatNumber: "300000000000003" },
  lines: [{ description: "Milk", quantity: 10, unitPrice: 12 }],
};

describe("submitInvoice", () => {
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

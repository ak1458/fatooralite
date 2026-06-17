import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { issueInvoice, NoCertificateError } from "./invoice-service";
import { generateKeyPair, verifyHash } from "@/lib/zatca/index";
import type { InvoiceInput } from "@/lib/zatca/types";

const dbFile = path.join(os.tmpdir(), `fl-svc-${Date.now()}.db`).replace(/\\/g, "/");
const url = `file:${dbFile}`;
let db: PrismaClient;
let companyId: string;

beforeAll(async () => {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  db = new PrismaClient({ datasourceUrl: url });
  const kp = generateKeyPair();
  const company = await db.company.create({
    data: { name: "Almarai", vatNumber: "311122334400003" },
  });
  companyId = company.id;
  await db.certificate.create({
    data: {
      companyId,
      kind: "production",
      status: "active",
      privateKey: kp.privateKeyPem,
      certificate: kp.publicKeyPem,
    },
  });
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

const input: InvoiceInput = {
  invoiceNumber: "INV-S-1",
  kind: "standard",
  issueDate: "2026-06-17",
  seller: { name: "Almarai", vatNumber: "311122334400003" },
  lines: [{ description: "Milk", quantity: 10, unitPrice: 12 }],
};

describe("issueInvoice", () => {
  it("signs, persists, and the signature verifies", async () => {
    const res = await issueInvoice(companyId, input, db);
    expect(res.status).toBe("signed");
    expect(res.signed.totals.grandTotal).toBe(138);
    const cert = await db.certificate.findFirstOrThrow({ where: { companyId } });
    expect(verifyHash(res.signed.hash, res.signed.signature, cert.certificate!)).toBe(true);

    const stored = await db.invoice.findUniqueOrThrow({ where: { id: res.invoiceId } });
    expect(stored.status).toBe("signed");
    expect(stored.hash).toBe(res.signed.hash);
    expect(stored.qr).toBeTruthy();
  });

  it("chains the previous invoice hash", async () => {
    const first = await issueInvoice(companyId, { ...input, invoiceNumber: "INV-S-2" }, db);
    const second = await issueInvoice(companyId, { ...input, invoiceNumber: "INV-S-3" }, db);
    const secondRow = await db.invoice.findUniqueOrThrow({ where: { id: second.invoiceId } });
    expect(secondRow.previousHash).toBe(first.signed.hash);
  });

  it("rejects when no active certificate exists", async () => {
    const bare = await db.company.create({ data: { name: "NoCert", vatNumber: "300000000000111" } });
    await expect(issueInvoice(bare.id, { ...input, invoiceNumber: "INV-S-X" }, db)).rejects.toBeInstanceOf(
      NoCertificateError,
    );
  });
});

// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { ZATCA_SYSTEM_PROMPT } from "@/lib/ai/zatca-prompt";
import { executeTool } from "@/lib/ai/tools";

/**
 * Phase 3 / W18 — the assistant sees exactly one tenant's data per request
 * and must never let that leak into an implied claim about the platform, or
 * about production/ZATCA facts no tool result actually confirmed. Two halves:
 * the system prompt states the boundary, and every read tool's own output is
 * tagged so the model can't quietly treat one company's rows as general
 * knowledge. Executing the real tools (not just confirmSummary, covered
 * already in tools.test.ts) is what lib/db/client.ts's prisma singleton
 * resolves against — this file requires TEST_DATABASE_URL like the other
 * DB-gated suites.
 */
let db: PrismaClient;
let companyId: string;
// ZATCA VAT format: /^3\d{13}3$/ — must both start AND end with 3.
const VAT = "300000000000843";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Scope Co", vatNumber: VAT } });
  companyId = company.id;
  await db.customer.create({ data: { companyId, name: "Test Customer" } });
  await db.product.create({ data: { companyId, name: "Test Product", unitPrice: 10, vatCategory: "S" } });
  await db.invoice.create({
    data: {
      companyId, invoiceNumber: "SCOPE-1", uuid: `scope-1-${companyId}`, kind: "simplified",
      status: "signed", issueDate: "2026-08-12", issueTime: "10:00:00",
      signedXml: "<Invoice/>", hash: "hash-scope-1",
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
    },
  });
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe("ZATCA_SYSTEM_PROMPT knowledge boundaries (W18)", () => {
  it("states the tenant-isolation, unverified-production, and human-review boundaries", () => {
    expect(ZATCA_SYSTEM_PROMPT).toContain("KNOWLEDGE BOUNDARIES");
    expect(ZATCA_SYSTEM_PROMPT).toContain("NOT VERIFIED");
    expect(ZATCA_SYSTEM_PROMPT).toContain("REQUIRES HUMAN REVIEW");
    expect(ZATCA_SYSTEM_PROMPT).toMatch(/exactly ONE business/);
  });
});

describe.skipIf(!hasTestDb)("tool output scope-prefixing (W18)", () => {
  const ctx = () => ({ companyId, userRole: "owner" });

  it("tags listInvoices output as [tenant-data]", async () => {
    const out = await executeTool("listInvoices", "{}", ctx());
    expect(out.content).toMatch(/^\[tenant-data/);
    expect(out.content).toContain("SCOPE-1");
  });

  it("tags listCustomers output as [tenant-data]", async () => {
    const out = await executeTool("listCustomers", "{}", ctx());
    expect(out.content).toMatch(/^\[tenant-data/);
    expect(out.content).toContain("Test Customer");
  });

  it("tags listProducts output as [tenant-data]", async () => {
    const out = await executeTool("listProducts", "{}", ctx());
    expect(out.content).toMatch(/^\[tenant-data/);
    expect(out.content).toContain("Test Product");
  });

  it("tags getComplianceStats output as [tenant-data]", async () => {
    const out = await executeTool("getComplianceStats", "{}", ctx());
    expect(out.content).toMatch(/^\[tenant-data/);
  });

  it("tags findInvoice output as [tenant-data]", async () => {
    const out = await executeTool("findInvoice", JSON.stringify({ invoiceNumber: "SCOPE-1" }), ctx());
    expect(out.content).toMatch(/^\[tenant-data/);
  });

  it("tags getReport output as [tenant-data]", async () => {
    const out = await executeTool("getReport", "{}", ctx());
    expect(out.content).toMatch(/^\[tenant-data/);
  });

  it("does not tag a plain not-found message — only real tenant rows get the scope tag", async () => {
    const out = await executeTool("findInvoice", JSON.stringify({ invoiceNumber: "does-not-exist" }), ctx());
    expect(out.content).not.toMatch(/^\[tenant-data/);
    expect(out.content).toContain("No invoice found");
  });
});

// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";

/**
 * Phase 3 / W11 — DB-level CHECK constraints, defence-in-depth behind rules
 * the app already enforces. See prisma/migrations/20260818160000_check_
 * constraints/migration.sql for the full rationale per constraint.
 *
 * These constraints have no schema.prisma representation (Prisma has no
 * CHECK support), so `prisma db push --force-reset` — which every DB-gated
 * test file's beforeAll may call — silently drops them along with the rest
 * of the schema, without knowing to recreate them. This file re-applies
 * them idempotently in its own beforeAll rather than assuming another
 * file's run order left them in place.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000810";

const CONSTRAINTS: [string, string][] = [
  ["InvoiceLine", `ADD CONSTRAINT "line_quantity_positive" CHECK ("quantity" > 0)`],
  ["InvoiceLine", `ADD CONSTRAINT "line_unitprice_nonneg" CHECK ("unitPrice" >= 0)`],
  ["InvoiceLine", `ADD CONSTRAINT "line_vatrate_bounds" CHECK ("vatRate" >= 0 AND "vatRate" <= 1)`],
  ["Invoice", `ADD CONSTRAINT "invoice_status_valid" CHECK ("status" IN ('draft','signed','submitted','cleared','reported','rejected'))`],
  ["Invoice", `ADD CONSTRAINT "invoice_kind_valid" CHECK ("kind" IN ('standard','simplified'))`],
  ["Invoice", `ADD CONSTRAINT "invoice_doctype_valid" CHECK ("documentType" IN ('invoice','credit','debit'))`],
  ["Invoice", `ADD CONSTRAINT "invoice_repstate_valid" CHECK ("reportingState" IN ('n/a','pending','reported','failed'))`],
  ["Invoice", `ADD CONSTRAINT "invoice_attempts_nonneg" CHECK ("submitAttempts" >= 0)`],
  ["Invoice", `ADD CONSTRAINT "invoice_total_coheres" CHECK (ABS("grandTotal" - ("taxableAmount" + "vatAmount")) <= 0.01)`],
  ["Subscription", `ADD CONSTRAINT "sub_plan_valid" CHECK ("plan" IN ('trial','pro'))`],
  ["Certificate", `ADD CONSTRAINT "cert_kind_valid" CHECK ("kind" IN ('compliance','production','local'))`],
  ["Certificate", `ADD CONSTRAINT "cert_status_valid" CHECK ("status" IN ('pending','compliance','active','expired','failed','used'))`],
];

async function ensureConstraints(db: PrismaClient) {
  for (const [table, clause] of CONSTRAINTS) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "${table}" ${clause}`);
    } catch (e) {
      // 42710 = duplicate_object (constraint already exists) — expected on a
      // database that wasn't just force-reset. Anything else is real.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/already exists/i.test(msg)) throw e;
    }
  }
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await ensureConstraints(db);
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const c = await db.company.create({ data: { name: "Constraint Co", vatNumber: VAT } });
  companyId = c.id;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

let n = 0;
async function makeInvoice(overrides: Record<string, unknown> = {}) {
  const num = `CK-${++n}`;
  return db.invoice.create({
    data: {
      companyId, invoiceNumber: num, uuid: `${num}-${companyId}`,
      kind: "standard", status: "draft", issueDate: "2026-08-12",
      taxableAmount: 100, vatAmount: 15, grandTotal: 115,
      ...overrides,
    },
  });
}

describe.skipIf(!hasTestDb)("DB CHECK constraints (W11)", () => {
  it("rejects a negative InvoiceLine quantity", async () => {
    const inv = await makeInvoice();
    await expect(
      db.invoiceLine.create({
        data: { invoiceId: inv.id, description: "x", quantity: -1, unitPrice: 10, vatRate: 0.15, netAmount: -10, vatAmount: -1.5 },
      }),
    ).rejects.toThrow();
  });

  it("rejects a negative InvoiceLine unitPrice", async () => {
    const inv = await makeInvoice();
    await expect(
      db.invoiceLine.create({
        data: { invoiceId: inv.id, description: "x", quantity: 1, unitPrice: -10, vatRate: 0.15, netAmount: -10, vatAmount: -1.5 },
      }),
    ).rejects.toThrow();
  });

  it("rejects an out-of-bounds InvoiceLine vatRate", async () => {
    const inv = await makeInvoice();
    await expect(
      db.invoiceLine.create({
        data: { invoiceId: inv.id, description: "x", quantity: 1, unitPrice: 10, vatRate: 1.5, netAmount: 10, vatAmount: 15 },
      }),
    ).rejects.toThrow();
  });

  it("allows a valid InvoiceLine (the constraint isn't over-broad)", async () => {
    const inv = await makeInvoice();
    await expect(
      db.invoiceLine.create({
        data: { invoiceId: inv.id, description: "x", quantity: 2, unitPrice: 50, vatRate: 0.15, netAmount: 100, vatAmount: 15 },
      }),
    ).resolves.toBeDefined();
  });

  it("rejects an invalid Invoice.status value", async () => {
    await expect(makeInvoice({ status: "not-a-real-status" })).rejects.toThrow();
  });

  it("rejects an invoice whose grandTotal doesn't cohere with taxable+vat", async () => {
    await expect(makeInvoice({ taxableAmount: 100, vatAmount: 15, grandTotal: 999 })).rejects.toThrow();
  });

  it("allows a grandTotal within the rounding tolerance", async () => {
    await expect(makeInvoice({ taxableAmount: 100, vatAmount: 15, grandTotal: 115.005 })).resolves.toBeDefined();
  });

  it("rejects a negative submitAttempts", async () => {
    await expect(makeInvoice({ submitAttempts: -1 })).rejects.toThrow();
  });

  it("rejects an invalid Subscription.plan but allows an arbitrary Subscription.status", async () => {
    await expect(
      db.subscription.create({ data: { companyId, plan: "enterprise", status: "active" } }),
    ).rejects.toThrow();
    // Deliberately NOT constrained (see migration header) — proves the
    // open-ended design is actually honored at the DB level, not just hoped for.
    await db.subscription.deleteMany({ where: { companyId } });
    await expect(
      db.subscription.create({ data: { companyId, plan: "trial", status: "some-future-provider-status" } }),
    ).resolves.toBeDefined();
  });

  it("rejects an invalid Certificate.kind, and accepts the real 'used' status the schema comment used to omit", async () => {
    await expect(
      db.certificate.create({ data: { companyId, kind: "not-a-real-kind", status: "active" } }),
    ).rejects.toThrow();
    await expect(
      db.certificate.create({ data: { companyId, kind: "compliance", status: "used" } }),
    ).resolves.toBeDefined();
  });
});

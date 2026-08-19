// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { queryAsTenant } from "@/lib/db/rls-client";

/**
 * D6 (docs/audit/decision-register.md) — proves the Postgres-level defence
 * actually holds: a query with NO `where` clause at all, run through the
 * RLS-scoped role, still cannot see another tenant's rows. This is the
 * scenario application-code bugs create (a forgotten `where: { companyId }`)
 * — RLS is the backstop for exactly that class of mistake, so the test
 * deliberately does not add its own tenant filter to the queries under test.
 *
 * See lib/db/check-constraints.test.ts for the established precedent this
 * follows: `prisma db push --force-reset` (any of the 6 schema-pushing test
 * files) drops and recreates the whole schema from schema.prisma alone,
 * silently wiping RLS policies/grants along with it — so this file
 * re-applies them idempotently in its own beforeAll rather than trusting
 * the committed migration to have persisted.
 */
let db: PrismaClient;
let companyA: string;
let companyB: string;

async function ensureRls(db: PrismaClient) {
  try {
    await db.$executeRawUnsafe(`CREATE ROLE fatoora_rls_app NOLOGIN`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/already exists/i.test(msg)) throw e;
  }
  await db.$executeRawUnsafe(`GRANT fatoora_rls_app TO CURRENT_USER`);
  await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO fatoora_rls_app`);
  await db.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON "Invoice", "Customer", "Product", "Certificate" TO fatoora_rls_app`,
  );
  for (const table of ["Invoice", "Customer", "Product", "Certificate"]) {
    await db.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    await db.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "${table}"`);
    await db.$executeRawUnsafe(
      `CREATE POLICY tenant_isolation ON "${table}" USING ("companyId" = current_setting('app.company_id', true))`,
    );
  }
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await ensureRls(db);
  await db.company.deleteMany({ where: { vatNumber: { in: ["300000000000853", "300000000000863"] } } });
  const a = await db.company.create({ data: { name: "RLS Co A", vatNumber: "300000000000853" } });
  const b = await db.company.create({ data: { name: "RLS Co B", vatNumber: "300000000000863" } });
  companyA = a.id;
  companyB = b.id;
  await db.customer.create({ data: { companyId: companyA, name: "A's customer" } });
  await db.customer.create({ data: { companyId: companyB, name: "B's customer" } });
  await db.product.create({ data: { companyId: companyA, name: "A's product", unitPrice: 10 } });
  await db.product.create({ data: { companyId: companyB, name: "B's product", unitPrice: 20 } });
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: { in: ["300000000000853", "300000000000863"] } } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("Postgres row-level security (D6)", () => {
  it("an unfiltered findMany — no where clause at all — still only returns the scoped tenant's rows", async () => {
    const rows = await queryAsTenant(companyA, (tx) => tx.customer.findMany());
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.companyId === companyA)).toBe(true);
    expect(rows.some((r) => r.companyId === companyB)).toBe(false);
  });

  it("switching the scoped tenant switches what's visible — not cached, not sticky", async () => {
    const asA = await queryAsTenant(companyA, (tx) => tx.product.findMany());
    const asB = await queryAsTenant(companyB, (tx) => tx.product.findMany());
    expect(asA.every((r) => r.companyId === companyA)).toBe(true);
    expect(asB.every((r) => r.companyId === companyB)).toBe(true);
    expect(asA.some((r) => r.companyId === companyB)).toBe(false);
  });

  it("an insert under the wrong tenant's scope is refused by the policy, not silently mis-attributed", async () => {
    await expect(
      queryAsTenant(companyA, (tx) =>
        tx.customer.create({ data: { companyId: companyB, name: "should be refused" } }),
      ),
    ).rejects.toThrow();
    const leaked = await db.customer.findFirst({ where: { companyId: companyB, name: "should be refused" } });
    expect(leaked).toBeNull();
  });

  it("the main application connection (no SET ROLE) is completely unaffected — sees every tenant, as before", async () => {
    const all = await db.customer.findMany({ where: { companyId: { in: [companyA, companyB] } } });
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});

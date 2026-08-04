import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, pushTestSchema, testClient } from "@/lib/db/test-db";
import { PLAN_LIMITS, getEffectivePlan, checkInvoiceLimit } from "./plan";

describe("PLAN_LIMITS", () => {
  it("free plan has finite limits", () => {
    expect(PLAN_LIMITS.free.invoicesPerMonth).toBe(20);
    expect(PLAN_LIMITS.free.branches).toBe(1);
    expect(PLAN_LIMITS.free.seats).toBe(2);
  });

  it("pro plan is unlimited (null) across the board", () => {
    expect(PLAN_LIMITS.pro.invoicesPerMonth).toBeNull();
    expect(PLAN_LIMITS.pro.branches).toBeNull();
    expect(PLAN_LIMITS.pro.seats).toBeNull();
  });
});

// DB-backed resolution logic (no-row / free / past_due / canceled / pro+active
// fallback rules) needs a real Postgres — same convention as lib/db/repo.test.ts
// and lib/services/invoice-service.test.ts. Skipped unless TEST_DATABASE_URL is set.
let db: PrismaClient;

beforeAll(async () => {
  if (!hasTestDb) return;
  pushTestSchema();
  db = testClient();
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
});

describe.skipIf(!hasTestDb)("getEffectivePlan / checkInvoiceLimit (DB-backed)", () => {
  async function makeCompany() {
    return db.company.create({ data: { name: "Acme", vatNumber: "300000000000003" } });
  }

  it("treats a company with no Subscription row as free", async () => {
    const company = await makeCompany();
    expect(await getEffectivePlan(company.id, db)).toBe("free");
  });

  it("treats free/active as free", async () => {
    const company = await makeCompany();
    await db.subscription.create({ data: { companyId: company.id, plan: "free", status: "active" } });
    expect(await getEffectivePlan(company.id, db)).toBe("free");
  });

  it("treats pro/active as pro", async () => {
    const company = await makeCompany();
    await db.subscription.create({ data: { companyId: company.id, plan: "pro", status: "active" } });
    expect(await getEffectivePlan(company.id, db)).toBe("pro");
  });

  it("treats pro/past_due as free (lapsed payment must not keep pro limits)", async () => {
    const company = await makeCompany();
    await db.subscription.create({ data: { companyId: company.id, plan: "pro", status: "past_due" } });
    expect(await getEffectivePlan(company.id, db)).toBe("free");
  });

  it("treats pro/canceled as free", async () => {
    const company = await makeCompany();
    await db.subscription.create({ data: { companyId: company.id, plan: "pro", status: "canceled" } });
    expect(await getEffectivePlan(company.id, db)).toBe("free");
  });

  it("treats pro/active with a passed currentPeriodEnd as free (unrenewed Moyasar checkout must not keep pro limits)", async () => {
    const company = await makeCompany();
    await db.subscription.create({
      data: { companyId: company.id, plan: "pro", status: "active", currentPeriodEnd: new Date(Date.now() - 86_400_000) },
    });
    expect(await getEffectivePlan(company.id, db)).toBe("free");
  });

  it("treats pro/active with a future currentPeriodEnd as pro", async () => {
    const company = await makeCompany();
    await db.subscription.create({
      data: { companyId: company.id, plan: "pro", status: "active", currentPeriodEnd: new Date(Date.now() + 86_400_000) },
    });
    expect(await getEffectivePlan(company.id, db)).toBe("pro");
  });

  it("treats pro/active with no currentPeriodEnd set as pro (no expiry to have passed)", async () => {
    const company = await makeCompany();
    await db.subscription.create({ data: { companyId: company.id, plan: "pro", status: "active" } });
    expect(await getEffectivePlan(company.id, db)).toBe("pro");
  });

  it("blocks a free-plan company once it hits the monthly invoice limit", async () => {
    const company = await makeCompany();
    for (let i = 0; i < PLAN_LIMITS.free.invoicesPerMonth; i++) {
      await db.invoice.create({
        data: {
          companyId: company.id,
          uuid: `uuid-${company.id}-${i}`,
          invoiceNumber: `INV-${i}`,
          kind: "standard",
          status: "draft",
          issueDate: "2026-07-20",
          taxableAmount: 100,
          vatAmount: 15,
          grandTotal: 115,
        },
      });
    }
    const check = await checkInvoiceLimit(company.id, db);
    expect(check.used).toBe(PLAN_LIMITS.free.invoicesPerMonth);
    expect(check.limit).toBe(PLAN_LIMITS.free.invoicesPerMonth);
    expect(check.allowed).toBe(false);
  });

  it("pro plan is always allowed regardless of usage", async () => {
    const company = await makeCompany();
    await db.subscription.create({ data: { companyId: company.id, plan: "pro", status: "active" } });
    const check = await checkInvoiceLimit(company.id, db);
    expect(check.limit).toBeNull();
    expect(check.allowed).toBe(true);
  });
});

import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, pushTestSchema, testClient } from "@/lib/db/test-db";
import { PLAN_LIMITS, TRIAL_DAYS } from "./entitlements";
import {
  checkBranchLimit,
  checkInvoiceLimit,
  checkSeatLimit,
  getEffectivePlan,
  getTenantPlan,
  requireFeature,
  startTrial,
} from "./plan";

// Plan-resolution rules themselves are pure and covered exhaustively in
// entitlements.test.ts. What needs a real database is the reading and counting
// around them: the trial upsert, usage counts against limits, and the feature
// gate end to end. Same convention as lib/db/repo.test.ts — skipped unless
// TEST_DATABASE_URL is set.
let db: PrismaClient;

beforeAll(async () => {
  if (!hasTestDb) return;
  pushTestSchema();
  db = testClient();
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
});

describe.skipIf(!hasTestDb)("plan (DB-backed)", () => {
  let seq = 0;

  async function makeCompany() {
    seq += 1;
    // Company.vatNumber is @unique, so the VAT number has to vary with `seq`
    // exactly as the name does. A fixed literal here made every company after
    // the first in this file fail on the unique constraint — invisible in CI,
    // which skips this suite when TEST_DATABASE_URL is unset.
    // Keeps the ZATCA shape: 15 digits, leading and trailing 3.
    return db.company.create({
      data: { name: `Acme ${seq}`, vatNumber: `3${String(seq).padStart(13, "0")}3` },
    });
  }

  async function makeTrialCompany() {
    const company = await makeCompany();
    await startTrial(company.id, db);
    return company;
  }

  async function makeProCompany(currentPeriodEnd: Date | null = null) {
    const company = await makeCompany();
    await db.subscription.create({
      data: { companyId: company.id, plan: "pro", status: "active", currentPeriodEnd },
    });
    return company;
  }

  async function addInvoices(companyId: string, n: number) {
    for (let i = 0; i < n; i++) {
      await db.invoice.create({
        data: {
          companyId,
          uuid: `uuid-${companyId}-${i}`,
          invoiceNumber: `INV-${i}`,
          kind: "standard",
          status: "draft",
          issueDate: "2026-08-04",
          taxableAmount: 100,
          vatAmount: 15,
          grandTotal: 115,
        },
      });
    }
  }

  describe("startTrial", () => {
    it("grants a 7-day trial", async () => {
      const company = await makeCompany();
      await startTrial(company.id, db);
      const { plan, trialDaysLeft } = await getTenantPlan(company.id, db);
      expect(plan).toBe("trial");
      expect(trialDaysLeft).toBe(TRIAL_DAYS);
    });

    it("does not restart an existing trial when called again", async () => {
      const company = await makeCompany();
      const past = new Date(Date.now() - 86_400_000);
      await db.subscription.create({
        data: { companyId: company.id, plan: "trial", status: "active", trialEndsAt: past },
      });
      await startTrial(company.id, db);
      expect(await getEffectivePlan(company.id, db)).toBe("expired");
    });

    it("does not downgrade a paying customer", async () => {
      const company = await makeProCompany(new Date(Date.now() + 30 * 86_400_000));
      await startTrial(company.id, db);
      expect(await getEffectivePlan(company.id, db)).toBe("pro");
    });
  });

  describe("getEffectivePlan", () => {
    // Under the previous free-tier model a missing row meant "free" and worked.
    // It is now "expired" on purpose, which is why the trial migration had to
    // backfill a row for every existing company.
    it("treats a company with no Subscription row as expired, not trial", async () => {
      const company = await makeCompany();
      expect(await getEffectivePlan(company.id, db)).toBe("expired");
    });

    it("resolves an active trial", async () => {
      const company = await makeTrialCompany();
      expect(await getEffectivePlan(company.id, db)).toBe("trial");
    });

    it("resolves an elapsed trial to expired", async () => {
      const company = await makeCompany();
      await db.subscription.create({
        data: {
          companyId: company.id,
          plan: "trial",
          status: "active",
          trialEndsAt: new Date(Date.now() - 86_400_000),
        },
      });
      expect(await getEffectivePlan(company.id, db)).toBe("expired");
    });

    it("resolves pro/active to pro", async () => {
      const company = await makeProCompany();
      expect(await getEffectivePlan(company.id, db)).toBe("pro");
    });

    it("lapses an unrenewed pro subscription to expired", async () => {
      const company = await makeProCompany(new Date(Date.now() - 86_400_000));
      expect(await getEffectivePlan(company.id, db)).toBe("expired");
    });
  });

  describe("checkInvoiceLimit", () => {
    it("blocks a trial once it reaches the monthly cap", async () => {
      const company = await makeTrialCompany();
      await addInvoices(company.id, PLAN_LIMITS.trial.invoicesPerMonth!);
      const check = await checkInvoiceLimit(company.id, db);
      expect(check).toMatchObject({
        plan: "trial",
        limit: PLAN_LIMITS.trial.invoicesPerMonth,
        used: PLAN_LIMITS.trial.invoicesPerMonth,
        allowed: false,
      });
    });

    it("allows a trial below the cap", async () => {
      const company = await makeTrialCompany();
      await addInvoices(company.id, 1);
      expect(await checkInvoiceLimit(company.id, db)).toMatchObject({ allowed: true, used: 1 });
    });

    it("allows pro regardless of usage", async () => {
      const company = await makeProCompany();
      await addInvoices(company.id, PLAN_LIMITS.trial.invoicesPerMonth! + 5);
      expect(await checkInvoiceLimit(company.id, db)).toMatchObject({ allowed: true, limit: null });
    });

    it("blocks an expired trial at zero", async () => {
      const company = await makeCompany();
      expect(await checkInvoiceLimit(company.id, db)).toMatchObject({ plan: "expired", limit: 0, allowed: false });
    });
  });

  describe("checkBranchLimit / checkSeatLimit", () => {
    it("allows a trial its first branch and refuses the second", async () => {
      const company = await makeTrialCompany();
      expect(await checkBranchLimit(company.id, db)).toMatchObject({ allowed: true, used: 0, limit: 1 });
      await db.branch.create({ data: { companyId: company.id, name: "HQ" } });
      expect(await checkBranchLimit(company.id, db)).toMatchObject({ allowed: false, used: 1 });
    });

    it("allows pro unlimited branches", async () => {
      const company = await makeProCompany();
      await db.branch.create({ data: { companyId: company.id, name: "HQ" } });
      expect(await checkBranchLimit(company.id, db)).toMatchObject({ allowed: true, limit: null });
    });

    it("counts existing users against the trial seat cap", async () => {
      const company = await makeTrialCompany();
      await db.user.create({
        data: { companyId: company.id, email: `a${seq}@x.test`, name: "A", role: "owner", passwordHash: "x" },
      });
      expect(await checkSeatLimit(company.id, db)).toMatchObject({ allowed: true, used: 1, limit: 2 });
      await db.user.create({
        data: { companyId: company.id, email: `b${seq}@x.test`, name: "B", role: "employee", passwordHash: "x" },
      });
      expect(await checkSeatLimit(company.id, db)).toMatchObject({ allowed: false, used: 2 });
    });
  });

  describe("requireFeature", () => {
    it("lets a trial through the whole compliance path", async () => {
      const company = await makeTrialCompany();
      expect(await requireFeature(company.id, "issueInvoice", db)).toBeNull();
      expect(await requireFeature(company.id, "submitToZatca", db)).toBeNull();
    });

    it("denies a trial a Pro-only feature, with an explanation", async () => {
      const company = await makeTrialCompany();
      const denial = await requireFeature(company.id, "aiWriteActions", db);
      expect(denial).toMatchObject({ feature: "aiWriteActions", plan: "trial" });
      expect(denial?.message).toContain("Pro");
    });

    it("denies an expired tenant even the compliance path, naming the trial as ended", async () => {
      const company = await makeCompany();
      const denial = await requireFeature(company.id, "issueInvoice", db);
      expect(denial?.plan).toBe("expired");
      expect(denial?.message).toContain("trial has ended");
    });

    it("lets pro through everything", async () => {
      const company = await makeProCompany();
      expect(await requireFeature(company.id, "aiWriteActions", db)).toBeNull();
      expect(await requireFeature(company.id, "apiKeys", db)).toBeNull();
    });
  });
});

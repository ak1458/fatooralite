// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { faultyDb } from "@/lib/testing/faults";
import { isFlagEnabled, resolveFlags } from "./flags";
import { FLAG_DEFAULTS } from "./registry";

/**
 * Phase 5 / N6. The precedence chain (env override > per-company row > code
 * default) is the whole point of this module — each level is tested to
 * actually win over the one below it, not just that the default works.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000001013";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Flags Co", vatNumber: VAT } });
  companyId = company.id;
}, 120_000);

afterEach(() => {
  delete process.env.FEATURE_CSV_IMPORT;
  delete process.env.FEATURE_EMAIL_INVOICE_DELIVERY;
});

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("isFlagEnabled (W... N6)", () => {
  it("resolves the code default when no row and no env override exist", async () => {
    expect(await isFlagEnabled(companyId, "csvImport", db)).toBe(FLAG_DEFAULTS.csvImport);
    expect(await isFlagEnabled(companyId, "emailInvoiceDelivery", db)).toBe(FLAG_DEFAULTS.emailInvoiceDelivery);
  });

  it("a per-company row overrides the code default", async () => {
    await db.featureFlag.create({ data: { companyId, flag: "csvImport", enabled: true } });
    expect(await isFlagEnabled(companyId, "csvImport", db)).toBe(true);
    await db.featureFlag.deleteMany({ where: { companyId, flag: "csvImport" } });
  });

  it("an env override wins over a per-company row, in both directions", async () => {
    await db.featureFlag.create({ data: { companyId, flag: "csvImport", enabled: true } });
    process.env.FEATURE_CSV_IMPORT = "false";
    expect(await isFlagEnabled(companyId, "csvImport", db)).toBe(false);

    process.env.FEATURE_CSV_IMPORT = "true";
    await db.featureFlag.upsert({
      where: { companyId_flag: { companyId, flag: "csvImport" } },
      create: { companyId, flag: "csvImport", enabled: false },
      update: { enabled: false },
    });
    expect(await isFlagEnabled(companyId, "csvImport", db)).toBe(true);

    await db.featureFlag.deleteMany({ where: { companyId, flag: "csvImport" } });
  });

  it("a DB failure resolves to the code default, not a thrown error", async () => {
    const broken = faultyDb(db, { model: "featureFlag", action: "findUnique", failTimes: 1 });
    expect(await isFlagEnabled(companyId, "csvImport", broken)).toBe(FLAG_DEFAULTS.csvImport);
  });

  it("resolveFlags returns every known flag for the company", async () => {
    const flags = await resolveFlags(companyId, db);
    expect(Object.keys(flags).sort()).toEqual(Object.keys(FLAG_DEFAULTS).sort());
  });
});

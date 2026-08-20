// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { searchInvoices } from "./repo";

/**
 * Phase 4 / W22 (A-197, A-198): `searchInvoices`'s substring search and the
 * DB's collation-driven sort order were never explicitly validated against
 * Arabic text — this locks both in against a real Postgres instance rather
 * than assuming Neon's default collation behaves as expected.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000943";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Arabic Text Co", vatNumber: VAT } });
  companyId = company.id;

  const rows: Array<{ invoiceNumber: string; uuid: string; buyerName: string }> = [
    { invoiceNumber: "AR-1", uuid: "ar-uuid-1", buyerName: "شركة المراعي" },
    { invoiceNumber: "AR-2", uuid: "ar-uuid-2", buyerName: "شركة Acme" },
    { invoiceNumber: "AR-3", uuid: "ar-uuid-3", buyerName: "أحمد للتجارة" },
    { invoiceNumber: "AR-4", uuid: "ar-uuid-4", buyerName: "خالد وشركاه" },
    { invoiceNumber: "AR-5", uuid: "ar-uuid-5", buyerName: "محمد للاستيراد" },
  ];
  for (const r of rows) {
    await db.invoice.create({
      data: { companyId, kind: "standard", issueDate: "2026-08-12", ...r },
    });
  }
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("searchInvoices — Arabic text (W22 / A-197)", () => {
  it("finds an invoice by an Arabic substring of buyerName", async () => {
    const results = await searchInvoices(companyId, "المراعي", db);
    expect(results.map((r) => r.invoiceNumber)).toContain("AR-1");
  });

  it("finds a mixed-script buyer by its Latin substring", async () => {
    const results = await searchInvoices(companyId, "Acme", db);
    expect(results.map((r) => r.invoiceNumber)).toContain("AR-2");
  });

  it("finds the same mixed-script buyer by its Arabic substring", async () => {
    const results = await searchInvoices(companyId, "شركة", db);
    const numbers = results.map((r) => r.invoiceNumber);
    expect(numbers).toContain("AR-1");
    expect(numbers).toContain("AR-2");
  });

  it("returns empty for an Arabic query matching nothing (no false positives)", async () => {
    const results = await searchInvoices(companyId, "لا يوجد نص مطابق", db);
    expect(results).toHaveLength(0);
  });
});

describe.skipIf(!hasTestDb)("Arabic sort order — DB collation (W22 / A-198)", () => {
  const SORT_VAT = "300000000000953";
  let sortCompanyId: string;

  beforeAll(async () => {
    if (!hasTestDb) return;
    await db.company.deleteMany({ where: { vatNumber: SORT_VAT } });
    const company = await db.company.create({ data: { name: "Arabic Sort Co", vatNumber: SORT_VAT } });
    sortCompanyId = company.id;
    // Alphabet-order test cases: أ (alef) < خ (kha) < م (mim), both in Arabic
    // alphabetical order AND in Unicode codepoint order (U+0623, U+062E,
    // U+0645) — inserted out of order so a passing sort is actually doing
    // something, not just echoing insertion order back.
    const rows = [
      { invoiceNumber: "SORT-MIM", uuid: "sort-uuid-mim", buyerName: "محمد للاستيراد" },
      { invoiceNumber: "SORT-ALEF", uuid: "sort-uuid-alef", buyerName: "أحمد للتجارة" },
      { invoiceNumber: "SORT-KHA", uuid: "sort-uuid-kha", buyerName: "خالد وشركاه" },
    ];
    for (const r of rows) {
      await db.invoice.create({ data: { companyId: sortCompanyId, kind: "standard", issueDate: "2026-08-12", ...r } });
    }
  }, 60_000);

  afterAll(async () => {
    if (!db) return;
    await db.company.deleteMany({ where: { vatNumber: SORT_VAT } });
  });

  it("orders Arabic buyerName ascending by the DB's own collation, following the Arabic alphabet", async () => {
    const query = () =>
      db.invoice.findMany({
        where: { companyId: sortCompanyId },
        orderBy: { buyerName: "asc" },
        select: { invoiceNumber: true },
      });
    const first = await query();
    expect(first.map((r) => r.invoiceNumber)).toEqual(["SORT-ALEF", "SORT-KHA", "SORT-MIM"]);

    // Determinism: the same query against the same data returns the same order twice.
    const second = await query();
    expect(second.map((r) => r.invoiceNumber)).toEqual(first.map((r) => r.invoiceNumber));
  }, 20_000);
});

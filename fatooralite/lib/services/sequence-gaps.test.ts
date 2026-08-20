// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { getSequenceIntegrity } from "./sequence-gaps";

/**
 * Phase 4 / W22 (A-030): `issueInvoice()` writes the chain-slot reservation
 * and the invoice row in the same transaction, so a consumed slot with no
 * invoice row behind it means a record was lost after the fact, not a crash
 * mid-issue. This exercises the detection directly against fixture data
 * shaped like that condition, without needing to sign/chain real invoices.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000933";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Sequence Co", vatNumber: VAT } });
  companyId = company.id;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("getSequenceIntegrity (W22 / A-030)", () => {
  it("reports intact when the counter and invoice count agree", async () => {
    // First test in the file: pays Prisma's cold-connection cost on top of 5
    // sequential round trips (upsert, deleteMany, 3x create) — the same
    // "genuinely slower, not stuck" signature documented in
    // docs/SESSION_HANDOFF_2026-08-18.md §3.2, not a suspected hang (no
    // concurrency/race is involved here to actually deadlock on).
    await db.invoiceCounter.upsert({
      where: { companyId },
      create: { companyId, next: 4 },
      update: { next: 4 },
    });
    await db.invoice.deleteMany({ where: { companyId } });
    for (let i = 0; i < 3; i++) {
      await db.invoice.create({
        data: { companyId, invoiceNumber: `SEQ-${i}`, uuid: `seq-uuid-${i}`, issueDate: "2026-08-12", kind: "standard" },
      });
    }
    const result = await getSequenceIntegrity(companyId, db);
    expect(result).toEqual({ slotsConsumed: 3, invoicesPresent: 3, missing: 0, extra: 0, intact: true });
  }, 20_000);

  it("flags a missing record when a row is deleted after the fact", async () => {
    const rows = await db.invoice.findMany({ where: { companyId }, select: { id: true }, take: 1 });
    await db.invoice.delete({ where: { id: rows[0].id } });
    const result = await getSequenceIntegrity(companyId, db);
    expect(result.missing).toBe(1);
    expect(result.extra).toBe(0);
    expect(result.intact).toBe(false);
  });

  it("flags extra rows separately from missing ones (e.g. seeded outside issueInvoice())", async () => {
    await db.invoiceCounter.update({ where: { companyId }, data: { next: 4 } }); // slotsConsumed = 3
    await db.invoice.deleteMany({ where: { companyId } });
    for (let i = 0; i < 5; i++) {
      await db.invoice.create({
        data: { companyId, invoiceNumber: `SEQ-EXTRA-${i}`, uuid: `seq-extra-uuid-${i}`, issueDate: "2026-08-12", kind: "standard" },
      });
    }
    const result = await getSequenceIntegrity(companyId, db);
    expect(result).toEqual({ slotsConsumed: 3, invoicesPresent: 5, missing: 0, extra: 2, intact: false });
  });

  it("a company with no counter row and no invoices is intact", async () => {
    await db.invoice.deleteMany({ where: { companyId } });
    await db.invoiceCounter.deleteMany({ where: { companyId } });
    const result = await getSequenceIntegrity(companyId, db);
    expect(result).toEqual({ slotsConsumed: 0, invoicesPresent: 0, missing: 0, extra: 0, intact: true });
  });
});

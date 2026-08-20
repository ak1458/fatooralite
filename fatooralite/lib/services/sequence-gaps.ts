import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";

export interface SequenceIntegrity {
  /** Chain slots consumed so far (InvoiceCounter.next - 1). */
  slotsConsumed: number;
  /** Invoice rows actually present for this company. */
  invoicesPresent: number;
  /** slotsConsumed - invoicesPresent, floored at 0: a chain slot with no invoice row behind it. */
  missing: number;
  /** invoicesPresent - slotsConsumed, floored at 0: rows present beyond what the counter accounts for (e.g. seeded outside issueInvoice()). */
  extra: number;
  /** True only when missing and extra are both 0. */
  intact: boolean;
}

/**
 * Phase 4 / W22 (A-030): `issueInvoice()` reserves a chain slot and writes the
 * invoice row in the same transaction (lib/services/invoice-service.ts), so a
 * consumed slot with no invoice row behind it cannot come from a crash — it
 * means a record was deleted or otherwise lost after the fact. `missing` and
 * `extra` are reported separately rather than netted against each other:
 * `extra` (more invoice rows than the counter accounts for, e.g. from a seed
 * script inserting directly) is a different condition from a missing
 * financial record, and folding them together would hide the one that
 * actually matters.
 */
export async function getSequenceIntegrity(
  companyId: string,
  db: PrismaClient = defaultDb,
): Promise<SequenceIntegrity> {
  const [counter, invoicesPresent] = await Promise.all([
    db.invoiceCounter.findUnique({ where: { companyId }, select: { next: true } }),
    db.invoice.count({ where: { companyId } }),
  ]);
  const slotsConsumed = (counter?.next ?? 1) - 1;
  const missing = Math.max(0, slotsConsumed - invoicesPresent);
  const extra = Math.max(0, invoicesPresent - slotsConsumed);
  return { slotsConsumed, invoicesPresent, missing, extra, intact: missing === 0 && extra === 0 };
}

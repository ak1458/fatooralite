/**
 * Volume fixture for performance work.
 *
 * The demo seed creates two invoices, which tells you nothing about how a
 * query behaves for a tenant three years into using the product. This creates
 * a throwaway company with a realistic number of invoices spread over time.
 *
 *   npx tsx scripts/seed-volume.ts            # 5000 invoices
 *   npx tsx scripts/seed-volume.ts 20000      # more
 *   npx tsx scripts/seed-volume.ts --clean    # remove it again
 *
 * The company is marked by VAT number so cleanup cannot delete anything else.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Reserved, obviously-synthetic VAT number — the cleanup key. */
const MARKER_VAT = "399999999999993";
const COMPANY_NAME = "Volume Test Co (synthetic)";

const STATUSES = ["cleared", "cleared", "cleared", "reported", "signed", "draft", "rejected"] as const;
const BUYERS = [
  "Tamimi Markets", "Panda Retail", "Jarir Bookstore", "Extra Stores", "Danube",
  "Al Othaim", "Lulu Hypermarket", "Nahdi Pharmacy", "Dawaa", "Saco",
];

async function clean() {
  const existing = await prisma.company.findUnique({ where: { vatNumber: MARKER_VAT } });
  if (!existing) {
    console.log("Nothing to clean — no volume-test company found.");
    return;
  }
  // Invoice/Customer/Product cascade from Company (see schema.prisma).
  await prisma.company.delete({ where: { id: existing.id } });
  console.log(`Removed ${COMPANY_NAME} and everything cascading from it.`);
}

async function seed(count: number) {
  await clean();

  const company = await prisma.company.create({
    data: {
      name: COMPANY_NAME,
      vatNumber: MARKER_VAT,
      onboardingStatus: "complete",
      onboardingStep: 6,
      subscription: { create: { plan: "pro", status: "active" } },
    },
  });

  const now = Date.now();
  const DAY = 86_400_000;
  const batchSize = 1000;

  for (let start = 0; start < count; start += batchSize) {
    const rows = [];
    for (let i = start; i < Math.min(start + batchSize, count); i++) {
      // Spread across ~2 years, newest first, so date-range queries are exercised.
      const createdAt = new Date(now - Math.floor((i / count) * 730) * DAY - (i % 24) * 3_600_000);
      const net = 50 + (i % 4000);
      rows.push({
        companyId: company.id,
        uuid: `vol-${company.id}-${i}`,
        invoiceNumber: `VOL-${String(i).padStart(7, "0")}`,
        kind: i % 3 === 0 ? "simplified" : "standard",
        status: STATUSES[i % STATUSES.length],
        issueDate: createdAt.toISOString().slice(0, 10),
        issueTime: "12:00:00",
        buyerName: i % 5 === 0 ? null : BUYERS[i % BUYERS.length],
        taxableAmount: net,
        vatAmount: Math.round(net * 0.15 * 100) / 100,
        grandTotal: Math.round(net * 1.15 * 100) / 100,
        createdAt,
      });
    }
    await prisma.invoice.createMany({ data: rows, skipDuplicates: true });

    // 1-3 lines per invoice. seed-volume previously created line-less
    // invoices, which meant PDF/report/detail joins were never exercised at
    // volume (Phase 3 / W14). Batched, never one create() per line — the F-A
    // lesson (sequential single-row inserts don't survive Neon latency at
    // this scale).
    const created = await prisma.invoice.findMany({
      where: { uuid: { in: rows.map((r) => r.uuid) } },
      select: { id: true, uuid: true, taxableAmount: true },
    });
    const byUuid = new Map(created.map((c) => [c.uuid, c]));
    const lineRows = rows.flatMap((r) => {
      const inv = byUuid.get(r.uuid);
      if (!inv) return [];
      const lineCount = 1 + (Number(inv.taxableAmount) % 3);
      const netEach = Math.round((Number(inv.taxableAmount) / lineCount) * 100) / 100;
      return Array.from({ length: lineCount }, (_, li) => ({
        invoiceId: inv.id,
        description: `Line ${li + 1}`,
        quantity: 1,
        unitPrice: netEach,
        vatRate: 0.15,
        netAmount: netEach,
        vatAmount: Math.round(netEach * 0.15 * 100) / 100,
      }));
    });
    await prisma.invoiceLine.createMany({ data: lineRows });

    process.stdout.write(`\r  seeded ${Math.min(start + batchSize, count)}/${count}`);
  }

  await prisma.customer.createMany({
    data: BUYERS.map((name, i) => ({ companyId: company.id, name, city: "Riyadh", vatNumber: `3111111111000${i}${i}` })),
    skipDuplicates: true,
  });

  console.log(`\nSeeded ${count} invoices for ${COMPANY_NAME} (id ${company.id}).`);
  console.log("Remove with: npx tsx scripts/seed-volume.ts --clean");
}

const arg = process.argv[2];
const run = arg === "--clean" ? clean() : seed(Number(arg) || 5000);
run.finally(() => prisma.$disconnect());

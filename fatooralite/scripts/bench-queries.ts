/**
 * Times the read paths behind each page against whatever data is in the
 * database. Pair with scripts/seed-volume.ts — timings against the two-invoice
 * demo tenant say nothing.
 *
 *   npx tsx scripts/seed-volume.ts 20000
 *   npx tsx scripts/bench-queries.ts
 *   npx tsx scripts/seed-volume.ts --clean
 *
 * Also reports rows read, because a query that is fast today only because the
 * table is small is the one that breaks in a year.
 */
import { PrismaClient } from "@prisma/client";
import {
  getDashboardKpis,
  getDashboardFeed,
  getDashboardVolume,
  getDashboardIntegration,
  getInvoiceList,
  getAnalyticsData,
} from "@/lib/db/queries";

const prisma = new PrismaClient();

async function time<T>(label: string, fn: () => Promise<T>, rows?: (r: T) => number) {
  // One warm-up so the first measurement is not just connection setup.
  await fn();
  const runs: number[] = [];
  let last: T | undefined;
  for (let i = 0; i < 3; i++) {
    const t = performance.now();
    last = await fn();
    runs.push(performance.now() - t);
  }
  const median = runs.sort((a, b) => a - b)[1];
  const n = rows && last !== undefined ? rows(last) : undefined;
  console.log(
    `${label.padEnd(34)} ${median.toFixed(0).padStart(6)} ms` + (n !== undefined ? `   rows≈${n}` : ""),
  );
}

async function main() {
  const company = await prisma.company.findFirst({
    where: { vatNumber: "399999999999993" },
  });
  if (!company) {
    console.error("No volume-test company. Run: npx tsx scripts/seed-volume.ts 20000");
    process.exit(1);
  }
  const id = company.id;
  const total = await prisma.invoice.count({ where: { companyId: id } });
  console.log(`Company ${company.name} — ${total} invoices\n`);

  await time("getDashboardKpis", () => getDashboardKpis(id, prisma));
  await time("getDashboardFeed", () => getDashboardFeed(id, 10, prisma), (r) => r.length);
  await time("getDashboardVolume", () => getDashboardVolume(id, prisma), (r) => r.length);
  await time("getDashboardIntegration", () => getDashboardIntegration(id, prisma));
  await time("getInvoiceList (page 1)", () => getInvoiceList(id, undefined, prisma), (r) => r.invoices.length);
  await time("getAnalyticsData", () => getAnalyticsData(id, prisma));

  console.log("\nRaw counts for comparison:");
  await time("invoice.count", () => prisma.invoice.count({ where: { companyId: id } }));
  await time("invoice.findMany take 50", () =>
    prisma.invoice.findMany({ where: { companyId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
  );
}

main().finally(() => prisma.$disconnect());

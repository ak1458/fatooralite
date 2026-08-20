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
import { searchInvoices } from "@/lib/db/repo";
import { querySecurityEvents } from "@/lib/audit/events";

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
  // Same query shape as app/api/reports/route.ts's month aggregate.
  await time("reports month aggregate", () =>
    prisma.invoice.findMany({
      where: { companyId: id, status: { in: ["cleared", "reported"] }, issueDate: { gte: "2026-01-01", lt: "2026-02-01" } },
      orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
    }),
    (r) => r.length,
  );
  // Three `contains` ORs, no index support — the prime seq-scan suspect at volume.
  await time("searchInvoices('almarai')", () => searchInvoices(id, "almarai", prisma), (r) => r.length);
  await time("querySecurityEvents (tenant timeline)", () => querySecurityEvents({ companyId: id }, prisma), (r) => r.length);
  await time("invoice detail + lines", async () => {
    const one = await prisma.invoice.findFirst({ where: { companyId: id } });
    return prisma.invoice.findUnique({ where: { id: one!.id }, include: { lines: true } });
  });

  console.log("\nRaw counts for comparison:");
  await time("invoice.count", () => prisma.invoice.count({ where: { companyId: id } }));
  await time("invoice.findMany take 50", () =>
    prisma.invoice.findMany({ where: { companyId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
  );

  console.log("\nEXPLAIN ANALYZE — searchInvoices (the seq-scan suspect):");
  const explainSearch = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
    // LIKE, not ILIKE — matches Prisma's `contains` without mode:"insensitive" (repo.ts's actual query).
    `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "Invoice" WHERE "companyId" = $1 AND ("invoiceNumber" LIKE $2 OR "uuid" LIKE $2 OR "buyerName" LIKE $2) ORDER BY "createdAt" DESC LIMIT 100`,
    id, "%almarai%",
  );
  console.log(explainSearch.map((r) => r["QUERY PLAN"]).join("\n"));

  console.log("\nEXPLAIN ANALYZE — invoice list (getInvoiceList's row query):");
  const explainList = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
    `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "Invoice" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
    id,
  );
  console.log(explainList.map((r) => r["QUERY PLAN"]).join("\n"));
}

main().finally(() => prisma.$disconnect());

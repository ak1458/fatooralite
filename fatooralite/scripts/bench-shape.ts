/**
 * Isolates round trips and rows transferred from raw latency.
 *
 * The database is remote, so wall-clock time is dominated by ~1.5s per round
 * trip and hides the thing that actually scales badly: how many rows a query
 * drags back to Node. This measures a single round trip as a baseline, then
 * compares each suspect query against the aggregate that could replace it.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function time<T>(label: string, fn: () => Promise<T>, describe?: (r: T) => string) {
  await fn();
  const runs: number[] = [];
  let last: T | undefined;
  for (let i = 0; i < 3; i++) {
    const t = performance.now();
    last = await fn();
    runs.push(performance.now() - t);
  }
  const median = runs.sort((a, b) => a - b)[1];
  console.log(
    `${label.padEnd(46)} ${median.toFixed(0).padStart(6)} ms  ${describe && last !== undefined ? describe(last) : ""}`,
  );
  return median;
}

async function main() {
  const company = await prisma.company.findFirst({ where: { vatNumber: "399999999999993" } });
  if (!company) { console.error("Run scripts/seed-volume.ts first."); process.exit(1); }
  const companyId = company.id;
  const total = await prisma.invoice.count({ where: { companyId } });
  console.log(`${total} invoices\n`);

  const baseline = await time("baseline: SELECT 1 (one round trip)", () => prisma.$queryRaw`SELECT 1`);
  console.log(`\n-> one round trip costs about ${baseline.toFixed(0)} ms here\n`);

  await time(
    "analytics today: findMany ALL invoices",
    () => prisma.invoice.findMany({ where: { companyId }, select: { taxableAmount: true, vatAmount: true, status: true, buyerName: true, createdAt: true } }),
    (r) => `rows transferred = ${r.length}`,
  );

  await time(
    "analytics could be: groupBy status",
    () => prisma.invoice.groupBy({ by: ["status"], where: { companyId }, _count: true, _sum: { vatAmount: true, taxableAmount: true } }),
    (r) => `rows transferred = ${r.length}`,
  );

  await time(
    "revenue-by-customer could be: groupBy buyerName top 5",
    () => prisma.invoice.groupBy({ by: ["buyerName"], where: { companyId, status: "cleared" }, _sum: { taxableAmount: true }, orderBy: { _sum: { taxableAmount: "desc" } }, take: 5 }),
    (r) => `rows transferred = ${r.length}`,
  );

  const since = new Date(Date.now() - 12 * 86_400_000);
  await time(
    "volume chart today: findMany last 12 days",
    () => prisma.invoice.findMany({ where: { companyId, createdAt: { gte: since } }, select: { createdAt: true } }),
    (r) => `rows transferred = ${r.length}`,
  );

  await time(
    "volume chart could be: raw GROUP BY day",
    () => prisma.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS n
      FROM "Invoice" WHERE "companyId" = ${companyId} AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    (r) => `rows transferred = ${r.length}`,
  );

  console.log("\nDashboard KPI round trips (currently sequential):");
  await time("4 sequential awaits", async () => {
    await prisma.invoice.count({ where: { companyId } });
    await prisma.invoice.count({ where: { companyId, status: "cleared" } });
    await prisma.invoice.aggregate({ where: { companyId, status: "cleared" }, _sum: { vatAmount: true } });
    await prisma.certificate.findFirst({ where: { companyId, kind: "production", status: "active" } });
  });
  await time("same 4, Promise.all", async () => {
    await Promise.all([
      prisma.invoice.count({ where: { companyId } }),
      prisma.invoice.count({ where: { companyId, status: "cleared" } }),
      prisma.invoice.aggregate({ where: { companyId, status: "cleared" }, _sum: { vatAmount: true } }),
      prisma.certificate.findFirst({ where: { companyId, kind: "production", status: "active" } }),
    ]);
  });
}

main().finally(() => prisma.$disconnect());

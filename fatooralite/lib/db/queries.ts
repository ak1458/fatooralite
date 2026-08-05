import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "./client";
import { num } from "./decimal";
import type { AnalyticsKpi, FeedEvent, HealthBar, Invoice, Kpi, RevenueRow, VolumeBar } from "@/types";

/**
 * Returns summary KPI data for the dashboard.
 */
export async function getDashboardKpis(companyId: string, db: PrismaClient = defaultDb) {
  // These four are independent, and the database is remote — awaiting them in
  // sequence cost four round trips for no reason. Measured against a 20k-invoice
  // tenant: 6236 ms sequential, 1440 ms in parallel (scripts/bench-shape.ts).
  const [totalInvoices, clearedInvoices, vatResult, cert] = await Promise.all([
    db.invoice.count({ where: { companyId } }),
    db.invoice.count({ where: { companyId, status: "cleared" } }),
    db.invoice.aggregate({ where: { companyId, status: "cleared" }, _sum: { vatAmount: true } }),
    db.certificate.findFirst({ where: { companyId, kind: "production", status: "active" } }),
  ]);
  const totalVat = num(vatResult._sum.vatAmount);

  const clearanceRate = totalInvoices > 0 ? (clearedInvoices / totalInvoices) * 100 : 100;

  const isReady = !!cert;
  let daysLeft = 0;
  if (cert?.expiresAt) {
    daysLeft = Math.max(0, Math.floor((cert.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  // Health bars derived from real state only: certificate presence gates the
  // gateway APIs; XML validation/signing is a local module that ships with the
  // app. No synthetic uptime percentages.
  const healthBars: HealthBar[] = [
    { label: { en: "Clearance API", ar: "واجهة الإجازة" }, pct: isReady ? 100 : 0 },
    { label: { en: "Reporting API", ar: "واجهة الإبلاغ" }, pct: isReady ? 100 : 0 },
    { label: { en: "Certificates", ar: "الشهادات" }, pct: cert ? 100 : 0 },
    { label: { en: "XML Validation", ar: "التحقق من XML" }, pct: 100 },
  ];

  // Readiness score: an active production CSID is the gate (60%), the rest is
  // the live clearance success rate (40%). A fresh tenant with no cert is 0.
  const score = Math.round(
    (isReady ? 60 : 0) + (totalInvoices > 0 ? (clearanceRate / 100) * 40 : isReady ? 40 : 0),
  );

  const kpis: Kpi[] = [
    { label: { en: "ZATCA Readiness", ar: "جاهزية الهيئة" }, value: `${score}%`, tag: isReady ? "Ready" : "Pending Setup", tone: isReady ? "ac" : "warn", icon: "compliance" },
    { label: { en: "Production CSID", ar: "شهادة الإنتاج CSID" }, value: cert ? "Active" : "None", tag: cert ? "Active" : "Action Required", tone: cert ? "ac" : "warn", icon: "cert" },
    { label: { en: "Certificate Expiry", ar: "انتهاء الشهادة" }, value: cert ? String(daysLeft) : "N/A", tag: cert ? "days left" : "—", tone: !cert || daysLeft > 30 ? "ac" : "warn", icon: "clock" },
    { label: { en: "Gateway", ar: "البوابة" }, value: isReady ? "Connected" : "Not connected", tag: isReady ? "CSID active" : "Connect ZATCA", tone: isReady ? "info" : "warn", icon: "bolt" },
  ];

  return {
    counters: {
      score,
      vat: totalVat,
      inv: totalInvoices,
      succ: clearanceRate,
    },
    healthBars,
    kpis,
  };
}

/**
 * Returns recent activity feed for the dashboard.
 */
export async function getDashboardFeed(companyId: string, limit = 10, db: PrismaClient = defaultDb): Promise<FeedEvent[]> {
  const records = await db.clearanceRecord.findMany({
    where: { invoice: { companyId } },
    include: { invoice: { select: { invoiceNumber: true, buyerName: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records.map(r => ({
    time: r.createdAt.toISOString(),
    status: (r.status === "accepted" ? "cleared" : r.status === "rejected" ? "rejected" : "warning") as FeedEvent["status"],
    inv: r.invoice.invoiceNumber,
    customer: { en: r.invoice.buyerName ?? "Walk-in customer", ar: r.invoice.buyerName ?? "عميل نقدي" },
    msg: r.responseCode ? { en: r.responseCode, ar: r.responseCode } : undefined,
  }));
}

/**
 * Returns 12-day volume bar chart data.
 */
/**
 * Invoices per UTC day for the last `days` days, counted in the database.
 *
 * Both the dashboard volume chart and the analytics daily bars previously
 * pulled every invoice in the window back to Node just to bucket them. That is
 * one row per invoice to render twelve bars — 329 rows for a tenant issuing a
 * modest daily volume, and unbounded as that grows. Counting in Postgres
 * returns one row per day instead (measured 329 → 13 rows, and the gap widens
 * with volume; see scripts/bench-shape.ts).
 *
 * `date_trunc` on a `timestamp` column buckets by UTC, matching the
 * `toISOString()` day keys this replaced.
 */
async function invoiceCountsByDay(
  companyId: string,
  days: number,
  db: PrismaClient,
): Promise<Map<string, number>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.$queryRaw<{ day: Date; n: bigint }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS n
    FROM "Invoice"
    WHERE "companyId" = ${companyId} AND "createdAt" >= ${since}
    GROUP BY 1
  `;
  return new Map(rows.map((r) => [r.day.toISOString().split("T")[0], Number(r.n)]));
}

export async function getDashboardVolume(companyId: string, db: PrismaClient = defaultDb): Promise<VolumeBar[]> {
  const now = new Date();
  const countsByDay = await invoiceCountsByDay(companyId, 12, db);

  // Create the last 12 days array
  const bars: VolumeBar[] = [];
  let maxCount = 0;
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().split('T')[0];
    const count = countsByDay.get(dayStr) ?? 0;
    if (count > maxCount) maxCount = count;
    
    // Very simple localized day abbreviation
    const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const arDays = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
    
    bars.push({
      day: { en: enDays[d.getDay()], ar: arDays[d.getDay()] },
      pct: count, // we will normalize this below
      highlight: i === 0, // Highlight today
    });
  }

  // Normalize to 0-100%
  if (maxCount > 0) {
    bars.forEach(b => {
      b.pct = Math.round((b.pct / maxCount) * 100);
    });
  }

  // Return real data — empty if no invoices (no dummy fallback)
  return bars;
}

/**
 * Returns integration service health based on real certificate/company state.
 */
export async function getDashboardIntegration(companyId: string, db: PrismaClient = defaultDb) {
  // Independent lookups — one round trip instead of two.
  const [cert, localCert] = await Promise.all([
    db.certificate.findFirst({ where: { companyId, kind: "production", status: "active" } }),
    db.certificate.findFirst({ where: { companyId, kind: "local", status: "active" } }),
  ]);

  const hasCert = !!cert;
  const hasAnyCert = hasCert || !!localCert;

  const services = [
    { name: { en: "CSID Issuance", ar: "إصدار CSID" }, ok: hasCert as boolean | "degraded" },
    { name: { en: "Cryptographic Stamp", ar: "الختم التشفيري" }, ok: hasAnyCert as boolean | "degraded" },
    { name: { en: "XML Validation", ar: "التحقق من XML" }, ok: true as boolean | "degraded" },
    { name: { en: "QR Generation", ar: "توليد QR" }, ok: true as boolean | "degraded" },
    { name: { en: "Clearance API", ar: "واجهة الإجازة" }, ok: (hasCert ? true : hasAnyCert ? "degraded" : false) as boolean | "degraded" },
    { name: { en: "Reporting API", ar: "واجهة الإبلاغ" }, ok: (hasCert ? true : hasAnyCert ? "degraded" : false) as boolean | "degraded" },
    { name: { en: "Sandbox Env", ar: "بيئة الاختبار" }, ok: true as boolean | "degraded" },
    { name: { en: "Production Env", ar: "بيئة الإنتاج" }, ok: hasCert as boolean | "degraded" },
  ];

  const badges = [
    { key: "trustReady", icon: "check", active: hasAnyCert },
    { key: "trustPhase2", icon: "compliance", active: hasCert },
    { key: "trustProd", icon: "bolt", active: hasCert },
    { key: "trustEnc", icon: "lock", active: true }, // encryption module is always available
  ];

  return { services, badges, hasCert, hasAnyCert, isLocal: !hasCert && hasAnyCert };
}

/**
 * List invoices formatted for the UI table.
 */
export async function getInvoiceList(
  companyId: string, 
  filter?: { status?: string },
  db: PrismaClient = defaultDb
): Promise<{ invoices: Invoice[], tabs: { id: string, count: string }[] }> {
  // Aggregate counts for tabs (grouped in one query; statuses match the
  // invoice lifecycle: draft|signed|submitted|cleared|reported|rejected).
  // Map UI tab ids onto lifecycle status sets so filtering matches the counts.
  const statusSets: Record<string, string[]> = {
    cleared: ["cleared", "reported"],
    pending: ["signed", "submitted"],
    rejected: ["rejected"],
    draft: ["draft"],
  };

  // The tab counts and the page of rows are independent — one round trip
  // rather than two against a remote database.
  const [grouped, rawInvoices] = await Promise.all([
    db.invoice.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
    db.invoice.findMany({
      where: {
        companyId,
        ...(filter?.status && filter.status !== "all"
          ? { status: { in: statusSets[filter.status] ?? [filter.status] } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50, // limit for UI
    }),
  ]);
  const countOf = (...statuses: string[]) =>
    grouped.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count._all, 0);
  const allCount = grouped.reduce((s, g) => s + g._count._all, 0);

  const tabs = [
    { id: "all", count: allCount.toString() },
    { id: "cleared", count: countOf("cleared", "reported").toString() },
    { id: "pending", count: countOf("signed", "submitted").toString() },
    { id: "rejected", count: countOf("rejected").toString() },
    { id: "draft", count: countOf("draft").toString() },
  ];

  const formatted: Invoice[] = rawInvoices.map(inv => ({
    num: inv.invoiceNumber,
    customer: { en: inv.buyerName || "Walk-in customer", ar: inv.buyerName || "عميل نقدي" },
    amount: num(inv.taxableAmount),
    type: inv.kind as Invoice["type"],
    status: inv.status as Invoice["status"],
    uuid: inv.uuid.substring(0, 8) + "…",
    result: inv.status === "cleared" ? "✓" : inv.resultCode ? inv.resultCode : "—",
    // Raw fields consumed by forms (e.g. the credit/debit note reference picker).
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    grandTotal: num(inv.grandTotal),
    documentType: inv.documentType,
  }));

  return { invoices: formatted, tabs };
}

/**
 * Returns analytics overview data
 */
export async function getAnalyticsData(companyId: string, db: PrismaClient = defaultDb) {
  // This used to be `findMany({ where: { companyId } })` with no bound — every
  // invoice the tenant had ever issued, pulled into Node on every page load,
  // then filtered five times and bucketed by day inside a 12-iteration loop
  // (O(12 × n) date-string conversions). At 20k invoices that is 20,000 rows
  // transferred to render six counters and five bars; the aggregates below
  // return 5, 5 and 13 rows respectively and the difference grows with volume.
  //
  // Everything here is independent, so the round trips overlap too.
  const [byStatus, topCustomers, distinctCustomers, countsByDay, clearanceRecords] = await Promise.all([
    db.invoice.groupBy({
      by: ["status"],
      where: { companyId },
      _count: true,
      _sum: { vatAmount: true },
    }),
    db.invoice.groupBy({
      by: ["buyerName"],
      where: { companyId, status: "cleared", buyerName: { not: null } },
      _sum: { taxableAmount: true },
      orderBy: { _sum: { taxableAmount: "desc" } },
      take: 5,
    }),
    // groupBy rather than findMany+distinct: same result, and measured ~400 ms
    // cheaper on a 20k-invoice tenant because it does not materialise a row
    // per distinct value through Prisma's distinct path.
    db.invoice.groupBy({
      by: ["buyerName"],
      where: { companyId, buyerName: { not: null } },
      _count: true,
    }),
    invoiceCountsByDay(companyId, 12, db),
    db.clearanceRecord
      .findMany({
        where: { invoice: { companyId }, status: "accepted" },
        select: { createdAt: true, invoice: { select: { createdAt: true } } },
        take: 100,
        orderBy: { createdAt: "desc" },
      })
      // ClearanceRecord may not exist yet — fine.
      .catch(() => [] as { createdAt: Date; invoice: { createdAt: Date } }[]),
  ]);

  const countFor = (status: string) => byStatus.find((r) => r.status === status)?._count ?? 0;
  const totalInvoices = byStatus.reduce((sum, r) => sum + r._count, 0);
  const clearedCount = countFor("cleared");
  const rejectedCount = countFor("rejected");
  const vatCollected = num(byStatus.find((r) => r.status === "cleared")?._sum.vatAmount);

  const clearanceSuccess = totalInvoices > 0 ? ((clearedCount / totalInvoices) * 100).toFixed(1) + "%" : "0%";
  const rejectionRate = totalInvoices > 0 ? ((rejectedCount / totalInvoices) * 100).toFixed(1) + "%" : "0%";

  const customers = new Set(distinctCustomers.map((c) => c.buyerName).filter(Boolean));

  let avgClearanceLabel = "—";
  {
    const records = clearanceRecords;
    if (records.length > 0) {
      const totalMs = records.reduce((sum, r) => {
        return sum + (r.createdAt.getTime() - r.invoice.createdAt.getTime());
      }, 0);
      const avgMs = totalMs / records.length;
      avgClearanceLabel = avgMs < 1000 ? `${Math.round(avgMs)}ms` : `${(avgMs / 1000).toFixed(1)}s`;
    }
  }

  const kpis: AnalyticsKpi[] = [
    { label: { en: "Total invoices", ar: "إجمالي الفواتير" }, value: totalInvoices.toString(), delta: "+0%" },
    { label: { en: "VAT collected", ar: "الضريبة المُحصّلة" }, value: "", delta: "+0%", amount: vatCollected },
    { label: { en: "Clearance success", ar: "نسبة الإجازة" }, value: clearanceSuccess, delta: "+0%" },
    { label: { en: "Rejection rate", ar: "نسبة الرفض" }, value: rejectionRate, delta: "-0%" },
    { label: { en: "Avg clearance", ar: "متوسط زمن الإجازة" }, value: avgClearanceLabel, delta: "" },
    { label: { en: "Active customers", ar: "العملاء النشطون" }, value: customers.size.toString(), delta: "+0" },
  ];

  // Top 5 by cleared revenue, ranked and truncated by the database.
  const sortedCust: [string, number][] = topCustomers.map((c) => [
    c.buyerName as string,
    num(c._sum.taxableAmount),
  ]);
  const maxRev = sortedCust.length > 0 ? sortedCust[0][1] : 1;
  
  const revenueByCustomer: RevenueRow[] = sortedCust.map(c => ({
    name: { en: c[0], ar: c[0] },
    value: (c[1] > 1000000 ? (c[1]/1000000).toFixed(2) + "M" : (c[1]/1000).toFixed(1) + "K"),
    pct: Math.round((c[1] / maxRev) * 100)
  }));

  // Daily invoice bars, from the same day-bucket aggregate the dashboard uses.
  const now = new Date();
  const dailyBars: number[] = [];
  let maxDay = 0;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const count = countsByDay.get(d.toISOString().split("T")[0]) ?? 0;
    dailyBars.push(count);
    if (count > maxDay) maxDay = count;
  }
  // Normalize to 0–100
  const normalizedBars = maxDay > 0
    ? dailyBars.map(c => Math.round((c / maxDay) * 100))
    : dailyBars;

  return {
    kpis,
    dailyBars: normalizedBars,
    // Empty when there is no cleared revenue yet — the UI renders an empty
    // state, never placeholder rows.
    revenueByCustomer,
    vatCollected,
    // Real status split for the success donut.
    clearance: {
      cleared: clearedCount,
      rejected: rejectedCount,
      pending: Math.max(0, totalInvoices - clearedCount - rejectedCount),
      pct: clearanceSuccess,
    },
  };
}


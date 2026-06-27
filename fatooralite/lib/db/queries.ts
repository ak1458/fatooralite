import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "./client";
import type { AnalyticsKpi, FeedEvent, HealthBar, Invoice, Kpi, RevenueRow, VolumeBar } from "@/types";

/**
 * Returns summary KPI data for the dashboard.
 */
export async function getDashboardKpis(companyId: string, db: PrismaClient = defaultDb) {
  // Aggregate data for counters
  const totalInvoices = await db.invoice.count({ where: { companyId } });
  const clearedInvoices = await db.invoice.count({ where: { companyId, status: "cleared" } });
  
  const vatResult = await db.invoice.aggregate({
    where: { companyId, status: "cleared" },
    _sum: { vatAmount: true },
  });
  const totalVat = vatResult._sum.vatAmount ?? 0;

  const clearanceRate = totalInvoices > 0 ? (clearedInvoices / totalInvoices) * 100 : 100;
  
  // ZATCA specific checks
  const cert = await db.certificate.findFirst({
    where: { companyId, kind: "production", status: "active" },
  });
  
  const isReady = cert ? 100 : 0;
  let daysLeft = 0;
  if (cert?.expiresAt) {
    daysLeft = Math.max(0, Math.floor((cert.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  // Health bars - mock health until we have a real service monitoring
  const healthBars: HealthBar[] = [
    { label: { en: "Clearance API", ar: "واجهة الإجازة" }, pct: isReady ? 99 : 0 },
    { label: { en: "Reporting API", ar: "واجهة الإبلاغ" }, pct: isReady ? 98 : 0 },
    { label: { en: "Certificates", ar: "الشهادات" }, pct: cert ? 100 : 0 },
    { label: { en: "XML Validation", ar: "التحقق من XML" }, pct: 97 },
  ];

  const kpis: Kpi[] = [
    { label: { en: "ZATCA Readiness", ar: "جاهزية الهيئة" }, value: isReady ? "100%" : "0%", tag: isReady ? "Ready" : "Pending Setup", tone: isReady ? "ac" : "warn", icon: "compliance" },
    { label: { en: "Production CSID", ar: "شهادة الإنتاج CSID" }, value: cert ? "Active" : "None", tag: cert ? "Active" : "Action Required", tone: cert ? "ac" : "warn", icon: "cert" },
    { label: { en: "Certificate Expiry", ar: "انتهاء الشهادة" }, value: cert ? String(daysLeft) : "N/A", tag: "days left", tone: daysLeft > 30 ? "ac" : "warn", icon: "clock" },
    { label: { en: "API Health", ar: "صحة الواجهة" }, value: isReady ? "Operational" : "Offline", tag: isReady ? "99.9%" : "N/A", tone: isReady ? "info" : "warn", icon: "bolt" },
  ];

  return {
    counters: {
      score: isReady ? 99 : 20,
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
    customer: { en: r.invoice.buyerName ?? "Unknown", ar: r.invoice.buyerName ?? "غير معروف" },
    msg: r.responseCode ? { en: r.responseCode, ar: r.responseCode } : undefined,
  }));
}

/**
 * Returns 12-day volume bar chart data.
 */
export async function getDashboardVolume(companyId: string, db: PrismaClient = defaultDb): Promise<VolumeBar[]> {
  // We'll approximate this by getting invoices from the last 12 days
  const now = new Date();
  const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
  
  const invoices = await db.invoice.findMany({
    where: { 
      companyId,
      createdAt: { gte: twelveDaysAgo }
    },
    select: { createdAt: true },
  });

  // Group by day string
  const countsByDay = new Map<string, number>();
  for (const inv of invoices) {
    const day = inv.createdAt.toISOString().split('T')[0];
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

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
  const cert = await db.certificate.findFirst({
    where: { companyId, kind: "production", status: "active" },
  });

  const localCert = await db.certificate.findFirst({
    where: { companyId, kind: "local", status: "active" },
  });

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
  // Aggregate counts for tabs
  const allCount = await db.invoice.count({ where: { companyId } });
  const clearedCount = await db.invoice.count({ where: { companyId, status: "cleared" } });
  const pendingCount = await db.invoice.count({ where: { companyId, status: "pending" } });
  const rejectedCount = await db.invoice.count({ where: { companyId, status: "rejected" } });
  const draftCount = await db.invoice.count({ where: { companyId, status: "draft" } });
  
  const tabs = [
    { id: "all", count: allCount.toString() },
    { id: "cleared", count: clearedCount.toString() },
    { id: "pending", count: pendingCount.toString() },
    { id: "rejected", count: rejectedCount.toString() },
    { id: "draft", count: draftCount.toString() },
  ];

  const rawInvoices = await db.invoice.findMany({
    where: { companyId, ...(filter?.status && filter.status !== 'all' ? { status: filter.status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50, // limit for UI
  });

  const formatted: Invoice[] = rawInvoices.map(inv => ({
    num: inv.invoiceNumber,
    customer: { en: inv.buyerName || "Unknown", ar: inv.buyerName || "غير معروف" },
    amount: inv.taxableAmount,
    type: inv.kind as Invoice["type"],
    status: inv.status as Invoice["status"],
    uuid: inv.uuid.substring(0, 8) + "…",
    result: inv.status === "cleared" ? "✓" : inv.resultCode ? inv.resultCode : "—",
    // Raw fields consumed by forms (e.g. the credit/debit note reference picker).
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    grandTotal: inv.grandTotal,
    documentType: inv.documentType,
  }));

  return { invoices: formatted, tabs };
}

/**
 * Returns analytics overview data
 */
export async function getAnalyticsData(companyId: string, db: PrismaClient = defaultDb) {
  const invs = await db.invoice.findMany({
    where: { companyId },
    select: { taxableAmount: true, vatAmount: true, status: true, buyerName: true, createdAt: true }
  });
  
  const totalInvoices = invs.length;
  const clearedCount = invs.filter(i => i.status === "cleared").length;
  const rejectedCount = invs.filter(i => i.status === "rejected").length;
  const vatCollected = invs.filter(i => i.status === "cleared").reduce((sum, i) => sum + i.vatAmount, 0);
  
  const clearanceSuccess = totalInvoices > 0 ? ((clearedCount / totalInvoices) * 100).toFixed(1) + "%" : "0%";
  const rejectionRate = totalInvoices > 0 ? ((rejectedCount / totalInvoices) * 100).toFixed(1) + "%" : "0%";
  
  // Calculate unique customers
  const customers = new Set(invs.map(i => i.buyerName).filter(Boolean));

  // Compute avg clearance time from clearance records (if available)
  let avgClearanceLabel = "—";
  try {
    const records = await db.clearanceRecord.findMany({
      where: { invoice: { companyId }, status: "accepted" },
      select: { createdAt: true, invoice: { select: { createdAt: true } } },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    if (records.length > 0) {
      const totalMs = records.reduce((sum, r) => {
        return sum + (r.createdAt.getTime() - r.invoice.createdAt.getTime());
      }, 0);
      const avgMs = totalMs / records.length;
      avgClearanceLabel = avgMs < 1000 ? `${Math.round(avgMs)}ms` : `${(avgMs / 1000).toFixed(1)}s`;
    }
  } catch {
    // ClearanceRecord may not exist yet — fine
  }

  const kpis: AnalyticsKpi[] = [
    { label: { en: "Total invoices", ar: "إجمالي الفواتير" }, value: totalInvoices.toString(), delta: "+0%" },
    { label: { en: "VAT collected", ar: "الضريبة المُحصّلة" }, value: "", delta: "+0%", amount: vatCollected },
    { label: { en: "Clearance success", ar: "نسبة الإجازة" }, value: clearanceSuccess, delta: "+0%" },
    { label: { en: "Rejection rate", ar: "نسبة الرفض" }, value: rejectionRate, delta: "-0%" },
    { label: { en: "Avg clearance", ar: "متوسط زمن الإجازة" }, value: avgClearanceLabel, delta: "" },
    { label: { en: "Active customers", ar: "العملاء النشطون" }, value: customers.size.toString(), delta: "+0" },
  ];

  // Group revenue by customer
  const revByCust = new Map<string, number>();
  invs.forEach(inv => {
    if (inv.buyerName && inv.status === "cleared") {
      revByCust.set(inv.buyerName, (revByCust.get(inv.buyerName) || 0) + inv.taxableAmount);
    }
  });

  const sortedCust = Array.from(revByCust.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxRev = sortedCust.length > 0 ? sortedCust[0][1] : 1;
  
  const revenueByCustomer: RevenueRow[] = sortedCust.map(c => ({
    name: { en: c[0], ar: c[0] },
    value: (c[1] > 1000000 ? (c[1]/1000000).toFixed(2) + "M" : (c[1]/1000).toFixed(1) + "K"),
    pct: Math.round((c[1] / maxRev) * 100)
  }));

  // Create dummy fallback if empty
  const defaultRevByCust: RevenueRow[] = [
    { name: { en: "No Data", ar: "لا توجد بيانات" }, value: "0", pct: 0 }
  ];

  // Compute real daily invoice bars (last 12 days, same logic as dashboard volume)
  const now = new Date();
  const dailyBars: number[] = [];
  let maxDay = 0;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().split("T")[0];
    const count = invs.filter(inv => inv.createdAt.toISOString().split("T")[0] === dayStr).length;
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
    revenueByCustomer: revenueByCustomer.length > 0 ? revenueByCustomer : defaultRevByCust,
    vatCollected
  };
}


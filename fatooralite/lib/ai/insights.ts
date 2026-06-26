import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";

export type InsightTone = "warn" | "info" | "ac";

export interface Insight {
  tag: string;
  tone: InsightTone;
  title: string;
  body: string;
}

export interface InsightStats {
  totalInvoices: number;
  rejectedCount: number;
  topRejectionCode: string | null;
  simplifiedAwaitingReport: number;
  nearDeadlineCount: number; // simplified, >18h since issuance, not yet reported
  overdueCount: number; // simplified, >24h, not reported (already non-compliant)
  monthVat: number;
  monthInvoices: number;
  certDaysLeft: number | null;
  anomalyMultiple: number | null; // largest invoice vs 30-day average
}

const REPORTED = new Set(["reported", "cleared", "rejected"]);

/** Hours elapsed since an invoice was issued, from its date + time strings. */
function hoursSinceIssue(issueDate: string, issueTime: string): number {
  const ts = Date.parse(`${issueDate}T${issueTime || "00:00:00"}`);
  if (Number.isNaN(ts)) return 0;
  return (Date.now() - ts) / 3_600_000;
}

/**
 * Compute data-grounded compliance insights for a company. Pure DB reads — no
 * AI required, so it always returns something useful. The AI layer (insights
 * route) consumes these stats to write a natural-language advisory on top.
 */
export async function computeInsights(
  companyId: string,
  db: PrismaClient = defaultDb,
): Promise<{ insights: Insight[]; stats: InsightStats }> {
  const [invoices, cert] = await Promise.all([
    db.invoice.findMany({
      where: { companyId },
      select: {
        kind: true,
        status: true,
        resultCode: true,
        issueDate: true,
        issueTime: true,
        vatAmount: true,
        grandTotal: true,
        createdAt: true,
      },
    }),
    db.certificate.findFirst({
      where: { companyId, kind: "production", status: "active" },
      orderBy: { createdAt: "desc" },
      select: { expiresAt: true },
    }),
  ]);

  // Rejections + most common rejection code.
  const rejected = invoices.filter((i) => i.status === "rejected" || i.resultCode);
  const codeCounts = new Map<string, number>();
  for (const i of rejected) {
    if (i.resultCode) codeCounts.set(i.resultCode, (codeCounts.get(i.resultCode) ?? 0) + 1);
  }
  const topRejectionCode =
    [...codeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Simplified invoices that still owe a report within their 24h window.
  const awaitingReport = invoices.filter(
    (i) => i.kind === "simplified" && !REPORTED.has(i.status),
  );
  let nearDeadlineCount = 0;
  let overdueCount = 0;
  for (const i of awaitingReport) {
    const h = hoursSinceIssue(i.issueDate, i.issueTime);
    if (h >= 24) overdueCount++;
    else if (h >= 18) nearDeadlineCount++;
  }

  // Current-month VAT.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthInv = invoices.filter(
    (i) => i.createdAt >= monthStart && REPORTED.has(i.status) && i.status !== "rejected",
  );
  const monthVat = monthInv.reduce((s, i) => s + i.vatAmount, 0);

  // Amount anomaly: largest invoice vs the 30-day average.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const recent = invoices.filter((i) => i.createdAt >= thirtyDaysAgo);
  const avg = recent.length
    ? recent.reduce((s, i) => s + i.grandTotal, 0) / recent.length
    : 0;
  const maxAmt = recent.reduce((m, i) => Math.max(m, i.grandTotal), 0);
  const anomalyMultiple = avg > 0 ? maxAmt / avg : null;

  const certDaysLeft = cert?.expiresAt
    ? Math.max(0, Math.floor((cert.expiresAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const stats: InsightStats = {
    totalInvoices: invoices.length,
    rejectedCount: rejected.length,
    topRejectionCode,
    simplifiedAwaitingReport: awaitingReport.length,
    nearDeadlineCount,
    overdueCount,
    monthVat,
    monthInvoices: monthInv.length,
    certDaysLeft,
    anomalyMultiple,
  };

  const insights: Insight[] = [];

  if (overdueCount > 0) {
    insights.push({
      tag: "Overdue",
      tone: "warn",
      title: `${overdueCount} simplified invoice${overdueCount > 1 ? "s" : ""} past the 24h reporting window`,
      body: "These are already non-compliant. Report them to ZATCA immediately to limit penalties.",
    });
  }
  if (nearDeadlineCount > 0) {
    insights.push({
      tag: "Risk",
      tone: "warn",
      title: `${nearDeadlineCount} invoice${nearDeadlineCount > 1 ? "s" : ""} near the reporting deadline`,
      body: "Simplified invoices must be reported within 24 hours of issuance. Submit them soon.",
    });
  }
  if (rejected.length > 0) {
    insights.push({
      tag: "Rejections",
      tone: "warn",
      title: `${rejected.length} rejected invoice${rejected.length > 1 ? "s" : ""}${topRejectionCode ? ` — top code ${topRejectionCode}` : ""}`,
      body: topRejectionCode
        ? `${topRejectionCode} is your most frequent failure. Fix the root cause before re-submitting.`
        : "Review the rejected invoices and resubmit corrected XML.",
    });
  }
  if (anomalyMultiple && anomalyMultiple >= 3) {
    insights.push({
      tag: "Anomaly",
      tone: "info",
      title: "Unusual spike in invoice amounts",
      body: `Your largest recent invoice is ${anomalyMultiple.toFixed(1)}× the 30-day average. Verify it is correct.`,
    });
  }
  if (certDaysLeft !== null && certDaysLeft <= 30) {
    insights.push({
      tag: "Certificate",
      tone: "warn",
      title: "Production CSID expiring soon",
      body: `Your signing certificate expires in ${certDaysLeft} day${certDaysLeft === 1 ? "" : "s"}. Renew it to avoid an outage.`,
    });
  } else if (certDaysLeft !== null) {
    insights.push({
      tag: "Tip",
      tone: "ac",
      title: "Certificate healthy",
      body: `Your production CSID is valid for ${certDaysLeft} more days.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      tag: "All clear",
      tone: "ac",
      title: "No compliance risks detected",
      body: `${stats.totalInvoices} invoice${stats.totalInvoices === 1 ? "" : "s"} reviewed. Nothing needs attention right now.`,
    });
  }

  return { insights, stats };
}

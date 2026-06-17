import type { EnvInfo } from "@/types";

/** Production CSID certificate snapshot. */
export const certificate = {
  serial: "4F:A2:9C:E1:00:7B",
  issued: "19 Dec 2025",
  expires: "19 Dec 2026",
  daysLeft: 247,
  pct: 67,
};

/** ZATCA environments shown on the Integration hub. */
export const environments: EnvInfo[] = [
  {
    name: { en: "Production", ar: "بيئة الإنتاج" },
    host: "api.zatca.gov.sa",
    status: { en: "Connected", ar: "متصلة" },
    latency: "42ms",
    tag: "PROD",
    sub: "GZIP · PROD-CSID signed",
  },
  {
    name: { en: "Sandbox", ar: "بيئة الاختبار" },
    host: "sandbox.zatca.gov.sa",
    status: { en: "Connected", ar: "متصلة" },
    latency: "58ms",
    tag: "TEST",
    sub: "TEST-CSID",
  },
];

/** Page title + subtitle per route id (subtitles are English helper copy). */
export const pageMeta: Record<string, { titleKey: string; sub: string }> = {
  dashboard: { titleKey: "ccTitle", sub: "ccSub" },
  invoices: { titleKey: "nInvoices", sub: "Create, clear and track ZATCA invoices" },
  creditNotes: { titleKey: "nCredit", sub: "Manage credit notes" },
  debitNotes: { titleKey: "nDebit", sub: "Manage debit notes" },
  customers: { titleKey: "nCustomers", sub: "Customer profiles & VAT records" },
  products: { titleKey: "nProducts", sub: "Products, services & VAT rates" },
  reports: { titleKey: "nReports", sub: "Compliance & financial reports" },
  analytics: { titleKey: "nAnalytics", sub: "Invoice intelligence & forecasting" },
  integration: { titleKey: "nIntegration", sub: "Sandbox & production connectivity" },
  clearance: { titleKey: "nCompliance", sub: "Real-time clearance & validation monitoring" },
  audit: { titleKey: "nAudit", sub: "Signed XML archive & cryptographic logs" },
  ai: { titleKey: "nAI", sub: "Your ZATCA compliance copilot" },
  notifications: { titleKey: "nNotifications", sub: "Alerts & compliance risks" },
  users: { titleKey: "nUsers", sub: "Roles & granular permissions" },
  settings: { titleKey: "nSettings", sub: "Workspace & tax configuration" },
};

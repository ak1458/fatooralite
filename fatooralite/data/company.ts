/** Page title + subtitle per route id (static UI copy, not data). */
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

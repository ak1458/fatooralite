import type { NavGroupDef } from "@/types";

/** Modules that are fully built. Everything else renders the stub screen. */
export const liveIds = [
  "dashboard",
  "invoices",
  "integration",
  "clearance",
  "analytics",
  "ai",
] as const;

export const navGroups: NavGroupDef[] = [
  {
    label: "gOverview",
    items: [{ id: "dashboard", label: "nDashboard", icon: "dashboard", href: "/dashboard" }],
  },
  {
    label: "gOps",
    items: [
      { id: "invoices", label: "nInvoices", icon: "invoices", href: "/invoices" },
      { id: "creditNotes", label: "nCredit", icon: "creditNote", href: "/credit-notes" },
      { id: "debitNotes", label: "nDebit", icon: "debitNote", href: "/debit-notes" },
      { id: "customers", label: "nCustomers", icon: "customers", href: "/customers" },
      { id: "products", label: "nProducts", icon: "products", href: "/products" },
    ],
  },
  {
    label: "gCompliance",
    items: [
      { id: "integration", label: "nIntegration", icon: "integration", href: "/integration" },
      { id: "clearance", label: "nCompliance", icon: "compliance", href: "/clearance" },
      { id: "audit", label: "nAudit", icon: "audit", href: "/audit" },
    ],
  },
  {
    label: "gIntel",
    items: [
      { id: "analytics", label: "nAnalytics", icon: "analytics", href: "/analytics" },
      { id: "ai", label: "nAI", icon: "ai", href: "/ai" },
      { id: "reports", label: "nReports", icon: "reports", href: "/reports" },
    ],
  },
  {
    label: "gAdmin",
    items: [
      { id: "notifications", label: "nNotifications", icon: "notifications", href: "/notifications" },
      { id: "users", label: "nUsers", icon: "users", href: "/users" },
      { id: "settings", label: "nSettings", icon: "settings", href: "/settings" },
    ],
  },
];

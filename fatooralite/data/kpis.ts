import type { HealthBar, Kpi } from "@/types";

/** Animated dashboard counters (final targets). */
export const counters = {
  score: 98.6,
  vat: 1284500,
  inv: 1429,
  succ: 99.2,
};

export const healthBars: HealthBar[] = [
  { label: { en: "Clearance API", ar: "واجهة الإجازة" }, pct: 99 },
  { label: { en: "Reporting API", ar: "واجهة الإبلاغ" }, pct: 98 },
  { label: { en: "Certificates", ar: "الشهادات" }, pct: 100 },
  { label: { en: "XML Validation", ar: "التحقق من XML" }, pct: 97 },
];

export const healthValues = ["99.4%", "98.1%", "100%", "97.3%"];

export const kpis: Kpi[] = [
  { label: { en: "ZATCA Readiness", ar: "جاهزية الهيئة" }, value: "99.2%", tag: "▲ 0.4", tone: "ac", icon: "compliance" },
  { label: { en: "Production CSID", ar: "شهادة الإنتاج CSID" }, value: "Active", tag: "GZIP", tone: "ac", icon: "cert" },
  { label: { en: "Certificate Expiry", ar: "انتهاء الشهادة" }, value: "247", tag: "days left", tone: "warn", icon: "clock" },
  { label: { en: "API Health", ar: "صحة الواجهة" }, value: "Operational", tag: "99.99%", tone: "info", icon: "bolt" },
];

export const trustBadges = [
  { key: "trustReady", icon: "check" },
  { key: "trustPhase2", icon: "compliance" },
  { key: "trustProd", icon: "bolt" },
  { key: "trustEnc", icon: "lock" },
] as const;

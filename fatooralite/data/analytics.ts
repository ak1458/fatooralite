import type { AnalyticsKpi, RevenueRow } from "@/types";

export const vatCollected = 1284500;

export const anKpis: AnalyticsKpi[] = [
  { label: { en: "Total invoices", ar: "إجمالي الفواتير" }, value: "1,429", delta: "+12.4%" },
  { label: { en: "VAT collected", ar: "الضريبة المُحصّلة" }, value: "", delta: "+8.1%", amount: vatCollected },
  { label: { en: "Clearance success", ar: "نسبة الإجازة" }, value: "99.2%", delta: "+0.3%" },
  { label: { en: "Rejection rate", ar: "نسبة الرفض" }, value: "0.8%", delta: "-0.2%" },
  { label: { en: "Avg clearance", ar: "متوسط زمن الإجازة" }, value: "1.8s", delta: "-0.3s" },
  { label: { en: "Active customers", ar: "العملاء النشطون" }, value: "342", delta: "+9" },
];

/** Daily invoice bars (MTD), last bar highlighted. */
export const dailyBars = [40, 55, 48, 70, 62, 80, 58, 72, 66, 88, 78, 92];

export const revenueByCustomer: RevenueRow[] = [
  { name: { en: "Abdul Latif Jameel", ar: "عبداللطيف جميل" }, value: "1.42M", pct: 100 },
  { name: { en: "Tamimi Markets", ar: "أسواق التميمي" }, value: "0.98M", pct: 69 },
  { name: { en: "Almarai", ar: "المراعي" }, value: "0.74M", pct: 52 },
  { name: { en: "Extra", ar: "إكسترا" }, value: "0.51M", pct: 36 },
  { name: { en: "Panda Retail", ar: "بنده" }, value: "0.33M", pct: 23 },
];

import type { ClearanceStat } from "@/types";

export const clearanceStats: ClearanceStat[] = [
  { label: { en: "Cleared today", ar: "مُجازة اليوم" }, value: "1,287", tone: "ac" },
  { label: { en: "Pending", ar: "قيد الانتظار" }, value: "14", tone: "warn" },
  { label: { en: "Rejected", ar: "مرفوضة" }, value: "3", tone: "dang" },
  { label: { en: "Success rate", ar: "نسبة النجاح" }, value: "99.2%", tone: "ac" },
];

/** Success donut figures. */
export const donut = {
  pct: "99.2%",
  cleared: 1287,
  pending: 14,
  rejected: 3,
  totalLabel: "1,287 / 1,297",
};

export const filterChips = [
  { en: "All", ar: "الكل" },
  { en: "Cleared", ar: "مُجازة" },
  { en: "Rejected", ar: "مرفوضة" },
  { en: "Pending", ar: "قيد الانتظار" },
  { en: "Warnings", ar: "تحذيرات" },
];

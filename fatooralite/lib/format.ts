import type { Lang } from "@/types";

/**
 * Number formatting. The design uses Latin digits with en-US grouping in both
 * languages, so we keep that for visual parity.
 */
export function num(n: number, _lang: Lang): string {
  return Number(n).toLocaleString("en-US");
}

/** Currency, locale-aware placement: "SAR 45,200" (en) / "45,200 ر.س" (ar). */
export function sar(n: number, lang: Lang): string {
  const v = num(n, lang);
  return lang === "ar" ? `${v} ر.س` : `SAR ${v}`;
}

/** Saudi standard VAT is 15%, rounded to the nearest halala-free riyal here. */
export function vatOf(amount: number): number {
  return Math.round(amount * 0.15);
}

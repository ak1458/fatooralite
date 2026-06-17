import type { VolumeBar } from "@/types";

const heights = [52, 42, 74, 50, 88, 70, 61];
const daysEn = ["S", "M", "T", "W", "T", "F", "S"];
const daysAr = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

/** Last-7-days invoice volume bars; index 4 (Thu) is highlighted. */
export const volume: VolumeBar[] = heights.map((pct, i) => ({
  pct,
  day: { en: daysEn[i], ar: daysAr[i] },
  highlight: i === 4,
}));

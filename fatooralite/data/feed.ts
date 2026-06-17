import type { FeedEvent } from "@/types";

// Dashboard live activity (compact, 5 rows).
const dashBase: [string, FeedEvent["status"], string, string, string][] = [
  ["09:42", "cleared", "INV-2026-04417", "Almarai Company", "شركة المراعي"],
  ["09:41", "cleared", "INV-2026-04416", "Jarir Marketing", "جرير للتسويق"],
  ["09:39", "rejected", "INV-2026-04413", "Mobily", "موبايلي"],
  ["09:37", "pending", "INV-2026-04415", "Nahdi Medical", "النهدي الطبية"],
  ["09:35", "cleared", "INV-2026-04414", "Tamimi Markets", "أسواق التميمي"],
];

export const feed: FeedEvent[] = dashBase.map(([time, status, inv, en, ar]) => ({
  time,
  status,
  inv,
  customer: { en, ar },
}));

// Clearance monitoring feed (detailed, 9 rows with messages).
const clBase: [string, FeedEvent["status"], string, string, string, string][] = [
  ["09:42:18", "cleared", "INV-2026-04417", "Almarai Company", "شركة المراعي", "Cleared in 1.4s · ICV 4417"],
  ["09:41:55", "cleared", "INV-2026-04416", "Jarir Marketing", "جرير للتسويق", "Cleared in 1.7s · ICV 4416"],
  ["09:40:30", "pending", "INV-2026-04415", "Nahdi Medical", "النهدي الطبية", "Submitted to clearance API"],
  ["09:39:12", "rejected", "INV-2026-04413", "Mobily", "موبايلي", "BR-KSA-83 · VAT category mismatch"],
  ["09:38:44", "warning", "INV-2026-04412", "Bin Dawood", "بن داود", "QR field length advisory"],
  ["09:37:02", "cleared", "INV-2026-04411", "Extra", "إكسترا", "Cleared in 2.1s · ICV 4411"],
  ["09:35:19", "cleared", "INV-2026-04410", "Panda Retail", "بنده", "Cleared in 1.2s · ICV 4410"],
  ["09:33:50", "cleared", "INV-2026-04409", "Abdul Latif Jameel", "عبداللطيف جميل", "Cleared in 1.9s · ICV 4409"],
  ["09:31:27", "rejected", "INV-2026-04407", "STC", "الاتصالات السعودية", "BR-KSA-09 · VAT number checksum"],
];

export const clearanceFeed: FeedEvent[] = clBase.map(([time, status, inv, en, ar, msg]) => ({
  time,
  status,
  inv,
  customer: { en, ar },
  msg: { en: msg, ar: msg },
}));

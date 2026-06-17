import type { Invoice } from "@/types";

const uuids = [
  "3c4f9e2a",
  "7b1d8c40",
  "a9e3f15b",
  "2d6c0b88",
  "f4a7e913",
  "8c2b5d6e",
  "1a9f7c33",
  "5e8d2a4f",
  "b3c6f019",
  "9d4e1c7a",
];

// [num, en name, ar name, amount(SAR), type, status]
const base: [string, string, string, number, Invoice["type"], Invoice["status"]][] = [
  ["INV-2026-04417", "Almarai Company", "شركة المراعي", 128400, "standard", "cleared"],
  ["INV-2026-04416", "Jarir Marketing", "جرير للتسويق", 45200, "standard", "cleared"],
  ["INV-2026-04415", "Nahdi Medical", "النهدي الطبية", 8750, "simplified", "pending"],
  ["INV-2026-04414", "Tamimi Markets", "أسواق التميمي", 233900, "standard", "cleared"],
  ["INV-2026-04413", "Mobily", "موبايلي", 67300, "standard", "rejected"],
  ["INV-2026-04412", "Bin Dawood", "بن داود", 15640, "simplified", "cleared"],
  ["INV-2026-04411", "Extra United Electronics", "إكسترا", 98120, "standard", "pending"],
  ["INV-2026-04410", "Panda Retail", "بنده للتجزئة", 54000, "standard", "cleared"],
  ["INV-2026-04409", "Abdul Latif Jameel", "عبداللطيف جميل", 412000, "standard", "cleared"],
  ["INV-2026-04408", "SACO", "ساكو", 23110, "simplified", "draft"],
];

export const invoices: Invoice[] = base.map(([num, en, ar, amount, type, status], i) => ({
  num,
  customer: { en, ar },
  amount,
  type,
  status,
  uuid: uuids[i] + "…",
  result: status === "cleared" ? "✓" : status === "rejected" ? "BR-KSA-83" : "—",
}));

/** Tab counts shown above the table. */
export const invoiceTabs = [
  { id: "all", count: "1,429" },
  { id: "cleared", count: "1,287" },
  { id: "pending", count: "14" },
  { id: "rejected", count: "3" },
  { id: "draft", count: "5" },
] as const;

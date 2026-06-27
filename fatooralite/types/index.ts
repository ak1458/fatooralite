import type { Dict } from "@/lib/i18n/dictionary";

export type Lang = "ar" | "en";
export type Theme = "dark" | "light";
export type InvoiceStatus =
  | "cleared"
  | "pending"
  | "rejected"
  | "draft"
  | "warning";
export type InvoiceType = "standard" | "simplified";

/** A string available in both supported languages. */
export interface Bilingual {
  ar: string;
  en: string;
}

export interface Invoice {
  num: string;
  customer: Bilingual;
  amount: number; // SAR, pre-VAT line total
  type: InvoiceType;
  status: InvoiceStatus;
  uuid: string; // short display form
  result: string; // "✓" | code like "BR-KSA-83" | "—"
  // Raw fields (present when served from getInvoiceList) used by forms/pickers.
  id?: string;
  invoiceNumber?: string;
  grandTotal?: number;
  documentType?: string;
}

export interface FeedEvent {
  time: string;
  status: InvoiceStatus;
  inv: string;
  customer: Bilingual;
  msg?: Bilingual;
}

export interface Kpi {
  label: Bilingual;
  value: string;
  tag: string;
  tone: "ac" | "warn" | "info";
  icon: string;
}

export interface Service {
  name: Bilingual;
  ok: boolean | "degraded";
}

export interface HealthBar {
  label: Bilingual;
  pct: number;
}

export interface VolumeBar {
  day: Bilingual;
  pct: number;
  highlight?: boolean;
}

export interface ClearanceStat {
  label: Bilingual;
  value: string;
  tone: "ac" | "warn" | "dang";
}

export interface AnalyticsKpi {
  label: Bilingual;
  value: string; // used when `amount` is absent
  delta: string;
  amount?: number; // when set, the component formats it as locale-aware SAR
}

export interface RevenueRow {
  name: Bilingual;
  value: string;
  pct: number;
}

export interface AiMessage {
  role: "user" | "assistant";
  text: Bilingual | string;
}

export interface AiInsight {
  tag: Bilingual;
  tone: "warn" | "info" | "ac";
  title: Bilingual;
  body: Bilingual;
}

/** Sidebar navigation. `label` is a key into the i18n dictionary. */
export interface NavItemDef {
  id: string;
  label: keyof Dict;
  icon: string;
  href: string;
  badge?: string;
}

export interface NavGroupDef {
  label: keyof Dict;
  items: NavItemDef[];
}

export interface EnvInfo {
  name: Bilingual;
  host: string;
  status: Bilingual;
  latency: string;
  tag: string; // PROD | TEST
  sub: string;
}

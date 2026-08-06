import type { Dict } from "@/lib/i18n/dictionary";
import type { InvoiceStatus, Lang } from "@/types";

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

/** Short status label + token colors, used by tables and clearance feeds.
 *  Accepts any status string (the DB has more than the display union). */
export function statusMeta(status: InvoiceStatus | string, t: Dict, lang: Lang): StatusMeta {
  switch (status) {
    case "cleared":
      return { label: t.smCleared, color: "var(--ac)", bg: "var(--acs)" };
    case "pending":
      return { label: t.smPending, color: "var(--warn)", bg: "var(--warns)" };
    case "rejected":
      return { label: t.smRejected, color: "var(--dang)", bg: "var(--dangs)" };
    case "draft":
      return { label: lang === "ar" ? "مسودة" : "Draft", color: "var(--t3)", bg: "var(--s3)" };
    case "warning":
      return { label: lang === "ar" ? "تحذير" : "Warning", color: "var(--warn)", bg: "var(--warns)" };
    case "reported":
      return { label: lang === "ar" ? "مُبلّغ" : "Reported", color: "var(--ac)", bg: "var(--acs)" };
    case "signed":
      return { label: lang === "ar" ? "موقّعة" : "Signed", color: "var(--info,#3b82f6)", bg: "var(--s3)" };
    case "submitted":
      return { label: lang === "ar" ? "مُرسلة" : "Submitted", color: "var(--warn)", bg: "var(--warns)" };
    default:
      return { label: String(status), color: "var(--t3)", bg: "var(--s3)" };
  }
}

/** Longer phrase labels used on the dashboard live feed. */
export function feedLabel(status: InvoiceStatus, t: Dict): string {
  if (status === "cleared") return t.fCleared;
  if (status === "rejected") return t.fRejected;
  return t.fPending;
}

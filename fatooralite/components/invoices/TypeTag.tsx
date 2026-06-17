"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import type { InvoiceType } from "@/types";

export function TypeTag({ type }: { type: InvoiceType }) {
  const { lang } = useLang();
  const isStandard = type === "standard";
  const label = isStandard
    ? lang === "ar"
      ? "ضريبية"
      : "Standard"
    : lang === "ar"
      ? "مبسطة"
      : "Simplified";
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 7,
        background: isStandard ? "var(--infos)" : "var(--s3)",
        color: isStandard ? "var(--info)" : "var(--t2)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

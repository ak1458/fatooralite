"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { invoiceTabs } from "@/data/invoices";

const LABELS: Record<string, { en: string; ar: string }> = {
  all: { en: "All", ar: "الكل" },
  cleared: { en: "Cleared", ar: "مُجازة" },
  pending: { en: "Pending", ar: "قيد الإجازة" },
  rejected: { en: "Rejected", ar: "مرفوضة" },
  draft: { en: "Drafts", ar: "مسودات" },
};

export function FilterTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  const { lang } = useLang();
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "var(--s1)",
        border: "1px solid var(--bd)",
        borderRadius: 13,
        padding: 4,
      }}
    >
      {invoiceTabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 13px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              background: on ? "var(--acs)" : "transparent",
              color: on ? "var(--ac)" : "var(--t2)",
            }}
          >
            <span>{LABELS[tab.id][lang]}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: 7,
                fontFamily: "var(--fmono)",
                background: on ? "var(--ac)" : "var(--s3)",
                color: on ? "#04130d" : "var(--t2)",
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

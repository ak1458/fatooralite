"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";

/** Faux search field in the topbar (static for pass 1). */
export function SearchButton() {
  const { t } = useLang();
  return (
    <button
      style={{
        width: "100%",
        maxWidth: 440,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 13px",
        borderRadius: 12,
        border: "1px solid var(--bd)",
        background: "var(--s1)",
        cursor: "text",
        color: "var(--t3)",
      }}
    >
      <Icon name="search" size={16} sw={2} />
      <span
        style={{
          flex: 1,
          textAlign: "start",
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {t.searchPh}
      </span>
      <span
        style={{
          fontFamily: "var(--fmono)",
          fontSize: 11,
          padding: "2px 7px",
          borderRadius: 6,
          border: "1px solid var(--bd)",
          color: "var(--t3)",
        }}
      >
        ⌘K
      </span>
    </button>
  );
}

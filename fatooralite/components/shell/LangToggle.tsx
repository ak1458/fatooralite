"use client";
import { useLang } from "@/lib/i18n/LangProvider";

/** Segmented ع / EN language switch. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  const ar = lang === "ar";
  return (
    <div
      style={{
        display: "flex",
        background: "var(--s1)",
        border: "1px solid var(--bd)",
        borderRadius: 10,
        padding: 2,
      }}
    >
      <button
        onClick={() => setLang("ar")}
        style={{
          fontSize: 13,
          fontWeight: 600,
          padding: "5px 11px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          fontFamily: "'IBM Plex Sans Arabic',sans-serif",
          background: ar ? "var(--acs)" : "transparent",
          color: ar ? "var(--ac)" : "var(--t3)",
        }}
      >
        ع
      </button>
      <button
        onClick={() => setLang("en")}
        style={{
          fontSize: 12,
          fontWeight: 700,
          padding: "5px 11px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: ar ? "transparent" : "var(--acs)",
          color: ar ? "var(--t3)" : "var(--ac)",
        }}
      >
        EN
      </button>
    </div>
  );
}

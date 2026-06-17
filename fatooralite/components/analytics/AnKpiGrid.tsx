"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar } from "@/lib/format";
import { anKpis } from "@/data/analytics";

export function AnKpiGrid() {
  const { lang } = useLang();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6,1fr)",
        gap: 14,
        marginBottom: 18,
      }}
    >
      {anKpis.map((k) => {
        const down = k.delta.startsWith("-");
        const value = k.amount !== undefined ? sar(k.amount, lang) : k.value;
        return (
          <div
            key={k.label.en}
            style={{
              borderRadius: 15,
              padding: 16,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
              boxShadow: "var(--sh)",
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                color: "var(--t3)",
                marginBottom: 8,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {k.label[lang]}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "var(--fdisp)",
                letterSpacing: "-.02em",
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ac)", marginTop: 5 }}>
              {down ? "▼" : "▲"} {k.delta}
            </div>
          </div>
        );
      })}
    </div>
  );
}

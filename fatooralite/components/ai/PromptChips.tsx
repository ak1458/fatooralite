"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { aiPrompts } from "@/data/ai";

export function PromptChips({ onSelect }: { onSelect?: (text: string) => void }) {
  const { lang } = useLang();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {aiPrompts.map((p) => (
        <button
          key={p.en}
          onClick={() => onSelect?.(p[lang])}
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            padding: "7px 13px",
            borderRadius: 20,
            border: "1px solid var(--bd)",
            background: "var(--s2)",
            color: "var(--t2)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {p[lang]}
        </button>
      ))}
    </div>
  );
}

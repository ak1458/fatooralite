"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { clearanceStats } from "@/data/clearance";

const TONE = {
  ac: { c: "var(--ac)", b: "var(--acs)" },
  warn: { c: "var(--warn)", b: "var(--warns)" },
  dang: { c: "var(--dang)", b: "var(--dangs)" },
};

export function ClearanceStats() {
  const { lang } = useLang();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 14,
        marginBottom: 18,
      }}
    >
      {clearanceStats.map((s) => {
        const tone = TONE[s.tone];
        return (
          <div
            key={s.label.en}
            style={{
              borderRadius: 16,
              padding: 18,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
              boxShadow: "var(--sh)",
            }}
          >
            <div style={{ fontSize: 12.5, color: "var(--t3)", marginBottom: 8 }}>
              {s.label[lang]}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: tone.c,
                  boxShadow: `0 0 0 4px ${tone.b}`,
                }}
              />
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  fontFamily: "var(--fdisp)",
                  letterSpacing: "-.02em",
                }}
              >
                {s.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

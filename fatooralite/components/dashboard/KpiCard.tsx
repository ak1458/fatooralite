"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import type { Kpi } from "@/types";

const TONE: Record<Kpi["tone"], { fg: string; bg: string }> = {
  ac: { fg: "var(--ac)", bg: "var(--acs)" },
  warn: { fg: "var(--warn)", bg: "var(--warns)" },
  info: { fg: "var(--info)", bg: "var(--infos)" },
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const { lang } = useLang();
  const tone = TONE[kpi.tone];
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 17,
        border: "1px solid var(--bd)",
        background: "var(--s1)",
        boxShadow: "var(--sh)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 118,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: tone.bg,
            color: tone.fg,
          }}
        >
          <Icon name={kpi.icon} size={17} sw={1.9} />
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: tone.fg,
            background: tone.bg,
            padding: "3px 8px",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {kpi.tag}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-.02em",
            fontFamily: "var(--fdisp)",
            lineHeight: 1.05,
          }}
        >
          {kpi.value}
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 3 }}>
          {kpi.label[lang]}
        </div>
      </div>
    </div>
  );
}

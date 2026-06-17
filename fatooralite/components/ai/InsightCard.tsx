"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import type { AiInsight } from "@/types";

const TONE: Record<AiInsight["tone"], { fg: string; bg: string }> = {
  warn: { fg: "var(--warn)", bg: "var(--warns)" },
  info: { fg: "var(--info)", bg: "var(--infos)" },
  ac: { fg: "var(--ac)", bg: "var(--acs)" },
};

export function InsightCard({ insight }: { insight: AiInsight }) {
  const { lang } = useLang();
  const tone = TONE[insight.tone];
  return (
    <Card style={{ padding: 17 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 9px",
          borderRadius: 7,
          background: tone.bg,
          color: tone.fg,
        }}
      >
        {insight.tag[lang]}
      </span>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 11, lineHeight: 1.4 }}>
        {insight.title[lang]}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 5, lineHeight: 1.5 }}>
        {insight.body[lang]}
      </div>
    </Card>
  );
}

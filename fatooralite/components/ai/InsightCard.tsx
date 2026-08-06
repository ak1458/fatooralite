"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import type { Bilingual } from "@/types";

type Tone = "warn" | "info" | "ac";
type Text = string | Bilingual;

export interface InsightCardData {
  tag: Text;
  tone: Tone;
  title: Text;
  body: Text;
}

const TONE: Record<Tone, { fg: string; bg: string }> = {
  warn: { fg: "var(--warn)", bg: "var(--warns)" },
  info: { fg: "var(--info)", bg: "var(--infos)" },
  ac: { fg: "var(--ac)", bg: "var(--acs)" },
};

export function InsightCard({ insight }: { insight: InsightCardData }) {
  const { lang } = useLang();
  const tone = TONE[insight.tone];
  const txt = (v: Text) => (typeof v === "string" ? v : v[lang]);
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
        {txt(insight.tag)}
      </span>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 11, lineHeight: 1.4 }}>
        {txt(insight.title)}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 5, lineHeight: 1.5 }}>
        {txt(insight.body)}
      </div>
    </Card>
  );
}

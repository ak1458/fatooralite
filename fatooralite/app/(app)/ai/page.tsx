"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { aiInsights } from "@/data/ai";
import { ChatThread } from "@/components/ai/ChatThread";
import { InsightCard } from "@/components/ai/InsightCard";

export default function AiPage() {
  const { t } = useLang();
  return (
    <div
      style={{
        maxWidth: 1480,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      <ChatThread />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: "var(--t3)",
            padding: "0 2px",
          }}
        >
          {t.aiInsightsLabel}
        </div>
        {aiInsights.map((ins, i) => (
          <InsightCard key={i} insight={ins} />
        ))}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { useCompany } from "@/lib/useCompany";
import { aiInsights } from "@/data/ai";
import { InsightCard, type InsightCardData } from "./InsightCard";

interface InsightsResponse {
  insights: InsightCardData[];
  summary: string | null;
}

export function InsightsPanel() {
  const { t } = useLang();
  const { company } = useCompany();
  const companyId = company?.id;
  // Static sample insights act as the loading/empty fallback.
  const [insights, setInsights] = useState<InsightCardData[]>(aiInsights);
  const [summary, setSummary] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/ai/insights?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data: InsightsResponse) => {
        if (cancelled || !data.insights) return;
        setInsights(data.insights);
        setSummary(data.summary ?? null);
        setLive(true);
      })
      .catch(() => {/* keep the fallback insights */});
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          color: "var(--t3)",
          padding: "0 2px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {t.aiInsightsLabel}
        {live && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ac)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ac)" }} />
            <span style={{ fontSize: 10.5, letterSpacing: 0 }}>live</span>
          </span>
        )}
      </div>

      {summary && (
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--t2)",
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--acs)",
            border: "1px solid rgba(16,185,129,.22)",
          }}
        >
          {summary}
        </div>
      )}

      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}
    </div>
  );
}

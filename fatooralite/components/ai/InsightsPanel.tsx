"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { useCompany } from "@/lib/useCompany";
import { InsightCard, type InsightCardData } from "./InsightCard";

interface InsightsResponse {
  insights: InsightCardData[];
  summary: string | null;
}

/**
 * Live compliance insights, computed from the tenant's real data by
 * /api/ai/insights. Shows a skeleton while loading and an honest empty state
 * on error — never placeholder insights.
 */
export function InsightsPanel() {
  const { t } = useLang();
  const { company } = useCompany();
  const companyId = company?.id;
  const [insights, setInsights] = useState<InsightCardData[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/ai/insights?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data: InsightsResponse) => {
        if (cancelled) return;
        if (!data.insights) {
          setFailed(true);
          return;
        }
        setInsights(data.insights);
        setSummary(data.summary ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
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
        {insights && (
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
            border: "1px solid var(--acbd)",
          }}
        >
          {summary}
        </div>
      )}

      {insights === null && !failed && (
        // Loading skeleton
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 74,
                borderRadius: 12,
                background: "var(--s2)",
                border: "1px solid var(--bd)",
                opacity: 0.55,
              }}
            />
          ))}
        </>
      )}

      {failed && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--t3)",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px dashed var(--bd)",
            textAlign: "center",
          }}
        >
          Insights are unavailable right now. Try again shortly.
        </div>
      )}

      {insights?.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}
    </div>
  );
}

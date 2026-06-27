"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { donut } from "@/data/clearance";
import { num } from "@/lib/format";

interface SuccessDonutProps {
  showLegend?: boolean;
  pct?: string;
  cleared?: number;
  pending?: number;
  rejected?: number;
  totalLabel?: string;
}

/** Donut chart of clearance success with a cleared/pending/rejected legend. */
export function SuccessDonut({
  showLegend = true,
  pct = donut.pct,
  cleared = donut.cleared,
  pending = donut.pending,
  rejected = donut.rejected,
  totalLabel = donut.totalLabel,
}: SuccessDonutProps) {
  const { t, lang } = useLang();
  
  const legend = [
    { key: "smCleared", color: "var(--ac)", value: cleared },
    { key: "smPending", color: "var(--warn)", value: pending },
    { key: "smRejected", color: "var(--dang)", value: rejected },
  ] as const;

  // Compute dashoffset from pct
  const pctNum = parseFloat(pct) || 0;
  const strokeDashoffset = 515 - (515 * pctNum) / 100;

  return (
    <Card style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, alignSelf: "flex-start", marginBottom: 18 }}>
        {t.successDonut}
      </div>
      <div style={{ position: "relative", width: 180, height: 180, marginBottom: 18 }}>
        <svg width="180" height="180" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="100" cy="100" r="82" fill="none" stroke="var(--s3)" strokeWidth="16" />
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            stroke="url(#donutg)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="515"
            strokeDashoffset={strokeDashoffset}
          />
          <defs>
            <linearGradient id="donutg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--acb)" />
              <stop offset="1" stopColor="var(--ac)" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "var(--fdisp)", letterSpacing: "-.02em" }}>
            {pct}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{totalLabel}</div>
        </div>
      </div>
      {showLegend && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
          {legend.map((l) => (
            <div
              key={l.key}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t2)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                {t[l.key]}
              </span>
              <span style={{ fontWeight: 600, fontFamily: "var(--fmono)" }}>{num(l.value, lang)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}


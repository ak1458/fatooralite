"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
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
  pct = "0%",
  cleared = 0,
  pending = 0,
  rejected = 0,
  totalLabel = "Total",
}: SuccessDonutProps) {
  const { t, lang } = useLang();
  
  const legend = [
    { key: "smCleared", color: "#38bdf8", value: cleared },
    { key: "smPending", color: "#a855f7", value: pending },
    { key: "smRejected", color: "#ec4899", value: rejected },
  ] as const;

  // Compute dashoffset from pct
  const pctNum = parseFloat(pct) || 0;
  const strokeDashoffset = 515 - (515 * pctNum) / 100;

  return (
    <Card
      folderTab={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔄</span>
          <span>{t.successDonut}</span>
        </div>
      }
      style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, alignSelf: "flex-start", marginBottom: 18, marginTop: 6, color: "var(--tx)" }}>
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
            stroke="url(#donutNeonGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="515"
            strokeDashoffset={strokeDashoffset}
            filter="drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))"
          />
          <defs>
            <linearGradient id="donutNeonGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#38bdf8" />
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
          <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "var(--fdisp)", letterSpacing: "-.02em", color: "var(--tx)" }}>
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
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                {t[l.key]}
              </span>
              <span style={{ fontWeight: 600, fontFamily: "var(--fmono)", color: "var(--tx)" }}>{num(l.value, lang)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}


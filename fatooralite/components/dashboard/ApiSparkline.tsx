"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";

interface ApiSparklineProps {
  latencyMs?: number;
  uptime?: string;
}

export function ApiSparkline({ latencyMs, uptime }: ApiSparklineProps) {
  const { t } = useLang();
  const displayLatency = latencyMs != null ? latencyMs : "—";
  const displayUptime = uptime ?? "N/A";
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.apiHealthTitle}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)" }}>
            {displayLatency}
            <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 500 }}>ms</span>
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>
        avg latency · {displayUptime} uptime
      </div>
      <svg
        viewBox="0 0 600 130"
        preserveAspectRatio="none"
        style={{ width: "100%", height: 120, display: "block" }}
      >
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ac)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--ac)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 95 L50 80 L100 88 L150 60 L200 72 L250 45 L300 58 L350 38 L400 52 L450 30 L500 44 L550 26 L600 40 L600 130 L0 130 Z"
          fill="url(#spark)"
        />
        <path
          d="M0 95 L50 80 L100 88 L150 60 L200 72 L250 45 L300 58 L350 38 L400 52 L450 30 L500 44 L550 26 L600 40"
          fill="none"
          stroke="var(--ac)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="600" cy="40" r="4" fill="var(--acb)" />
      </svg>
    </Card>
  );
}


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
      {/* There is no latency telemetry in this product yet. This card used to
          draw a fixed, always-rising SVG path — a fabricated performance trend
          on a card titled "Real-Time API Health", directly beside its own
          labels reading "— ms" and "N/A uptime". An empty state is the honest
          rendering until real measurements exist to plot. */}
      {latencyMs == null ? (
        <div
          style={{
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 16px",
            border: "1px dashed var(--bd)",
            borderRadius: 12,
            color: "var(--t3)",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {t.apiHealthEmpty}
        </div>
      ) : (
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
          <line x1="0" y1="65" x2="600" y2="65" stroke="var(--ac)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="600" cy="65" r="4" fill="var(--acb)" />
        </svg>
      )}
    </Card>
  );
}


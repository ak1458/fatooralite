"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar } from "@/lib/format";
import { Card } from "@/components/ui/Card";

export function VatTrend({ vatCollected }: { vatCollected: number }) {
  const { t, lang } = useLang();
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
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.vatTrend}</div>
        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)" }}>
          {sar(vatCollected, lang)}
        </span>
      </div>
      <svg
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        style={{ width: "100%", height: 180, display: "block" }}
      >
        <defs>
          <linearGradient id="vatg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ac)" stopOpacity=".26" />
            <stop offset="1" stopColor="var(--ac)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 160 L60 150 L120 158 L180 120 L240 130 L300 95 L360 105 L420 70 L480 80 L540 45 L600 55 L600 200 L0 200 Z"
          fill="url(#vatg)"
        />
        <path
          d="M0 160 L60 150 L120 158 L180 120 L240 130 L300 95 L360 105 L420 70 L480 80 L540 45 L600 55"
          fill="none"
          stroke="var(--ac)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Card>
  );
}

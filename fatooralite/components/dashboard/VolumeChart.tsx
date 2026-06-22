"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { num } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import type { VolumeBar } from "@/types";

export function VolumeChart({ initialData }: { initialData?: VolumeBar[] }) {
  const { t, lang } = useLang();
  const volumeData = initialData ?? [];

  // Calculate total volume for today (assuming highlight is today)
  const todayCount = volumeData.find(v => v.highlight)?.pct || 0;

  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.invoiceVolume}</div>
        <span style={{ fontSize: 11.5, color: "var(--t3)" }}>{t.last7}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 }}>
        <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--fdisp)" }}>
          <AnimatedCounter to={todayCount} format={(n) => num(n, lang)} />
        </span>
        <span style={{ fontSize: 12, color: "var(--ac)", fontWeight: 600 }}>{t.invToday}</span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          gap: 9,
          minHeight: 120,
        }}
      >
        {volumeData.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${v.pct}%`,
                borderRadius: "7px 7px 4px 4px",
                background: v.highlight
                  ? "linear-gradient(180deg,var(--acb),var(--ac))"
                  : "var(--s3)",
              }}
            />
            <span style={{ fontSize: 10.5, color: "var(--t3)", fontWeight: 600 }}>
              {v.day[lang]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

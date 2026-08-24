"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { num } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import type { VolumeBar } from "@/types";

export function VolumeChart({ initialData }: { initialData?: VolumeBar[] }) {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState("Weekdays");
  const volumeData = initialData ?? [];

  // `pct` is the normalised bar height (0-100), not a count — reading it
  // here printed "100 invoices today" for any tenant whose busiest day in the
  // window was today, which for a new tenant means their very first invoice.
  const todayCount = volumeData.find((v) => v.highlight)?.count ?? 0;

  return (
    <Card
      folderTab={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>📊</span>
          <span>{t.invoiceVolume}</span>
        </div>
      }
      style={{ display: "flex", flexDirection: "column", minHeight: 250 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          marginTop: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--fdisp)", color: "var(--tx)" }}>
            <AnimatedCounter to={todayCount} format={(n) => num(n, lang)} />
          </span>
          <span style={{ fontSize: 12, color: "var(--ac)", fontWeight: 600 }}>{t.invToday}</span>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter volume period"
          style={{
            padding: "4px 10px",
            borderRadius: 10,
            border: "1px solid var(--bd)",
            background: "var(--s2)",
            color: "var(--t2)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <option value="Weekdays">Weekdays ▾</option>
          <option value="AllDays">7 Days ▾</option>
          <option value="Month">Month ▾</option>
        </select>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          minHeight: 140,
          padding: "10px 4px 0",
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
              position: "relative",
            }}
          >
            {v.highlight && (
              <span
                style={{
                  position: "absolute",
                  top: `calc(${100 - Math.max(v.pct, 20)}% - 22px)`,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 6,
                  background: "var(--ac)",
                  color: "var(--on-ac)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 10px -2px var(--ac)",
                }}
              >
                {v.count} inv
              </span>
            )}
            <div
              style={{
                width: "100%",
                maxWidth: 36,
                height: `${Math.max(v.pct, 8)}%`,
                borderRadius: "8px 8px 4px 4px",
                background: v.highlight
                  ? "linear-gradient(180deg, var(--acb), var(--ac))"
                  : "linear-gradient(180deg, var(--s3), var(--s2))",
                border: v.highlight ? "1px solid var(--acb)" : "1px solid var(--bd)",
                boxShadow: v.highlight ? "0 4px 16px -2px var(--ac)" : "none",
                transition: "height 0.3s ease",
              }}
            />
            <span style={{ fontSize: 11, color: v.highlight ? "var(--tx)" : "var(--t3)", fontWeight: 600 }}>
              {v.day[lang]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

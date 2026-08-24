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
        {volumeData.map((v, i) => {
          const isHigh = v.pct >= 70;
          const isMid = v.pct >= 40 && v.pct < 70;
          const barBg = v.highlight
            ? "linear-gradient(180deg, #38bdf8, #00f2ff)"
            : isHigh
            ? "linear-gradient(180deg, #0284c7, #0369a1)"
            : isMid
            ? "linear-gradient(180deg, #1e293b, #0f172a)"
            : "linear-gradient(180deg, #161b26, #0c1017)";
          const barBorder = v.highlight
            ? "1px solid #00f2ff"
            : isHigh
            ? "1px solid rgba(56, 189, 248, 0.4)"
            : isMid
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(255, 255, 255, 0.06)";
          const barGlow = v.highlight
            ? "0 0 16px rgba(0, 242, 255, 0.5)"
            : isHigh
            ? "0 0 10px rgba(2, 132, 199, 0.3)"
            : "none";

          return (
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
                    top: `calc(${100 - Math.max(v.pct, 20)}% - 24px)`,
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 6,
                    background: "#00f2ff",
                    color: "#04130d",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 12px rgba(0, 242, 255, 0.6)",
                  }}
                >
                  {v.count} inv
                </span>
              )}
              <div
                style={{
                  width: "100%",
                  maxWidth: 34,
                  height: `${Math.max(v.pct, 10)}%`,
                  borderRadius: "6px 6px 3px 3px",
                  background: barBg,
                  border: barBorder,
                  boxShadow: barGlow,
                  transition: "all 0.25s ease",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: 11, color: v.highlight ? "#00f2ff" : isHigh ? "#38bdf8" : "var(--t3)", fontWeight: v.highlight ? 700 : 600 }}>
                {v.day[lang]}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import type { HealthBar } from "@/types";

export const RING_RADIUS = 130;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈816.81

/** SVG dash offset for a 0–100 score (0 at 100%, full circumference at 0%). */
export function ringOffset(score: number): number {
  return RING_CIRCUMFERENCE * (1 - score / 100);
}

interface HealthRingProps {
  score: number;
  healthBars?: HealthBar[];
  healthValues?: string[];
}

export function HealthRing({ score }: HealthRingProps) {
  const { t, lang } = useLang();
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    const dur = 1200;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      setAnimatedPct(90.6 * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  return (
    <Card
      folderTab={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>⚡</span>
          <span>{lang === "ar" ? "معاملات وإجازة الفواتير" : "Transactions & Clearance"}</span>
        </div>
      }
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: 280,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          marginTop: 4,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)" }}>
            {lang === "ar" ? "توزيع الإجازة الفورية" : "Live Clearance Breakdown"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>
            {lang === "ar" ? "معدل الاعتماد مع بوابة ZATCA" : "Real-time Phase-2 clearance gateway status"}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.12)",
            color: "#34d399",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          98.4% {lang === "ar" ? "معتمد" : "Cleared"}
        </span>
      </div>

      {/* Semicircular Multi-Color Donut Gauge (Reference 1) */}
      <div style={{ position: "relative", width: "100%", height: 110, display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 240 120" width="220" height="110" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="arcPink" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="arcPurple" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="arcCyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="arcGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path d="M 20 110 A 100 100 0 0 1 220 110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" strokeLinecap="round" />

          {/* Segment 1: Successful (Pink/Fuchsia) 90.6% */}
          <path d="M 20 110 A 100 100 0 0 1 155 20" fill="none" stroke="url(#arcPink)" strokeWidth="18" strokeLinecap="round" />

          {/* Segment 2: Hard Declines (Purple) */}
          <path d="M 165 24 A 100 100 0 0 1 190 45" fill="none" stroke="url(#arcPurple)" strokeWidth="18" />

          {/* Segment 3: Soft Declines (Cyan) */}
          <path d="M 196 52 A 100 100 0 0 1 210 75" fill="none" stroke="url(#arcCyan)" strokeWidth="18" />

          {/* Segment 4: Disputed / Refunded (Green) */}
          <path d="M 214 83 A 100 100 0 0 1 220 110" fill="none" stroke="url(#arcGreen)" strokeWidth="18" strokeLinecap="round" />
        </svg>

        {/* Center Percentage Display */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--tx)", fontFamily: "var(--fdisp)" }}>
            {animatedPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10.5, color: "var(--t3)", fontWeight: 600 }}>
            {lang === "ar" ? "اعتماد فوري" : "Instant Clearance"}
          </div>
        </div>
      </div>

      {/* 2x2 Metric Breakdown Grid (Reference 1) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--bd)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ec4899", marginTop: 4, flex: "none" }} />
          <div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{lang === "ar" ? "فواتير معتمدة" : "Successful"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>16,985 (90.6%)</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#a855f7", marginTop: 4, flex: "none" }} />
          <div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{lang === "ar" ? "رفض كامل" : "Hard Declines"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>637 (3.4%)</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#38bdf8", marginTop: 4, flex: "none" }} />
          <div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{lang === "ar" ? "تحذير Schematron" : "Soft Warnings"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>1,120 (6.0%)</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "#34d399", marginTop: 4, flex: "none" }} />
          <div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{lang === "ar" ? "إشعار دائن/مدين" : "Credit/Debit Notes"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>245 (1.3%)</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

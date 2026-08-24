"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";

interface SplineTelemetryProps {
  completedCount?: number;
  growthPct?: string;
}

export function SplineTelemetry({
  completedCount = 30,
  growthPct = "+10% today",
}: SplineTelemetryProps) {
  const { lang } = useLang();
  const [period, setPeriod] = useState("Week");

  return (
    <div
      className="glass-card"
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        padding: "24px 26px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 220,
        boxShadow: "var(--sh)",
        background: "radial-gradient(100% 100% at 100% 0%, rgba(168, 85, 247, 0.12) 0%, transparent 60%), var(--s1)",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", color: "var(--tx)" }}>
            {lang === "ar" ? "الفواتير المكتملة" : "Completed Invoices"}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 9px",
              borderRadius: 12,
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              color: "#c084fc",
            }}
          >
            {growthPct}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Select period"
            style={{
              padding: "5px 10px",
              borderRadius: 10,
              border: "1px solid var(--bd)",
              background: "var(--s2)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--tx)",
              cursor: "pointer",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="Week">{lang === "ar" ? "أسبوعي" : "Week"}</option>
            <option value="Month">{lang === "ar" ? "شهري" : "Month"}</option>
            <option value="Year">{lang === "ar" ? "سنوي" : "Year"}</option>
          </select>
        </div>
      </div>

      {/* SVG Spline Wave Area Chart with glowing peak callout '30' */}
      <div style={{ position: "relative", width: "100%", height: 115, marginTop: 12, zIndex: 2 }}>
        {/* Y Axis Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pointerEvents: "none",
            opacity: 0.35,
            fontSize: 10,
            fontWeight: 700,
            color: "var(--t3)",
          }}
        >
          <div style={{ borderBottom: "1px dashed var(--bd)", paddingBottom: 2 }}>40</div>
          <div style={{ borderBottom: "1px dashed var(--bd)", paddingBottom: 2 }}>30</div>
          <div>20</div>
        </div>

        {/* Spline Wave SVG */}
        <svg
          viewBox="0 0 400 115"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="splineAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#a855f7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
            <filter id="splineGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Area Fill */}
          <path
            d="M 15 90 C 80 85, 120 70, 180 50 C 230 35, 270 30, 310 25 C 340 20, 370 45, 395 55 L 395 115 L 15 115 Z"
            fill="url(#splineAreaGrad)"
          />

          {/* Stroke Curve */}
          <path
            d="M 15 90 C 80 85, 120 70, 180 50 C 230 35, 270 30, 310 25 C 340 20, 370 45, 395 55"
            fill="none"
            stroke="#c084fc"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#splineGlow)"
          />

          {/* Glowing Peak Node at 310,25 */}
          <circle cx="310" cy="25" r="7" fill="#141924" stroke="#c084fc" strokeWidth="2.5" />
          <circle cx="310" cy="25" r="3.5" fill="#f0abfc" />

          {/* Value Callout Badge */}
          <g transform="translate(310, 15)">
            <rect x="-14" y="-22" width="28" height="18" rx="6" fill="#1e1b4b" stroke="#c084fc" strokeWidth="1" />
            <text x="0" y="-10" fill="#f8fafc" fontSize="10.5" fontWeight="800" textAnchor="middle">
              {completedCount}
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom X-Axis Days */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--t3)",
          marginTop: 8,
          paddingInline: 8,
          zIndex: 2,
        }}
      >
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span style={{ color: "#c084fc", fontWeight: 700 }}>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>
    </div>
  );
}

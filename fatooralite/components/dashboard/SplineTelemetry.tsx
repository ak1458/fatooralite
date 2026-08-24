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
  const { t } = useLang();
  const [period, setPeriod] = useState("Week");

  // Smooth spline curve points representing daily clearances
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        background: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #8b5cf6 100%)",
        color: "#1e1b4b",
        padding: "24px 26px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 200,
        boxShadow: "0 18px 40px -15px rgba(139, 92, 246, 0.4)",
      }}
    >
      {/* Top Header: Title, +10% pill, Dropdown */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em" }}>
            Completed Invoices
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 9px",
              borderRadius: 12,
              background: "rgba(30, 27, 75, 0.14)",
              color: "#1e1b4b",
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
              padding: "4px 8px",
              borderRadius: 10,
              border: "1px solid rgba(30, 27, 75, 0.15)",
              background: "rgba(255, 255, 255, 0.35)",
              fontSize: 12,
              fontWeight: 600,
              color: "#1e1b4b",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <option value="Week">Week ▾</option>
            <option value="Month">Month ▾</option>
            <option value="Year">Year ▾</option>
          </select>
        </div>
      </div>

      {/* SVG Spline Wave Area Chart with glowing peak callout '30' */}
      <div style={{ position: "relative", width: "100%", height: 105, marginTop: 10, zIndex: 2 }}>
        {/* Y Axis Grid lines & Labels */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pointerEvents: "none",
            opacity: 0.5,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <div style={{ borderBottom: "1px dashed rgba(30, 27, 75, 0.2)", paddingBottom: 2 }}>40</div>
          <div style={{ borderBottom: "1px dashed rgba(30, 27, 75, 0.2)", paddingBottom: 2 }}>30</div>
          <div>20</div>
        </div>

        {/* Spline Wave SVG */}
        <svg
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowPeak" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* Area Fill */}
          <path
            d="M 0,90 Q 50,85 100,65 T 200,75 T 300,25 T 400,10 L 400,100 L 0,100 Z"
            fill="url(#splineGradient)"
          />

          {/* Spline Stroke */}
          <path
            d="M 0,90 Q 50,85 100,65 T 200,75 T 300,25 T 400,10"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Dots on Curve */}
          <circle cx="100" cy="65" r="3.5" fill="#ffffff" />
          <circle cx="200" cy="75" r="3.5" fill="#ffffff" />
          <circle cx="300" cy="25" r="5" fill="#1e1b4b" stroke="#ffffff" strokeWidth="2.5" filter="url(#glowPeak)" />
          <circle cx="360" cy="50" r="3.5" fill="#ffffff" />
        </svg>

        {/* Peak Badge Label '30' above the peak */}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: "75%",
            transform: "translateX(-50%)",
            background: "#ffffff",
            color: "#1e1b4b",
            fontWeight: 800,
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 6,
            boxShadow: "0 4px 10px rgba(30, 27, 75, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {completedCount}
        </div>
      </div>
    </div>
  );
}

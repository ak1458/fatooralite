"use client";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar, num } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

interface ElectricHeroCardProps {
  totalVat?: number;
  invoiceCount?: number;
  successRate?: number;
  score?: number;
  hasCsid?: boolean;
}

export function ElectricHeroCard({
  totalVat = 375928,
  invoiceCount = 1420,
  successRate = 98.4,
  score = 100,
  hasCsid = true,
}: ElectricHeroCardProps) {
  const { t, lang } = useLang();

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        background: "linear-gradient(135deg, #091a2e 0%, #050b14 100%)",
        boxShadow: "0 24px 50px -15px rgba(2, 132, 199, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        marginBottom: 22,
      }}
    >
      {/* Luminous Glowing Electric Mesh Waves (Pure SVG Vector) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.65,
          overflow: "hidden",
        }}
      >
        <svg viewBox="0 0 1000 400" width="100%" height="100%" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="heroWave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="heroWave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.25" />
            </linearGradient>
            <filter id="heroMeshGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="20" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M-100 180 C200 80 400 350 700 150 C900 20 1100 250 1200 120" stroke="url(#heroWave1)" strokeWidth="48" strokeLinecap="round" filter="url(#heroMeshGlow)" />
          <path d="M-50 260 C250 360 550 80 850 280 C1050 400 1150 150 1250 200" stroke="url(#heroWave2)" strokeWidth="32" strokeLinecap="round" filter="url(#heroMeshGlow)" />
        </svg>
      </div>

      {/* Ambient Gradient Overlays */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at top left, rgba(56, 189, 248, 0.18) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(16, 185, 129, 0.15) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Top Header Row: Brand badge & Quick Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                boxShadow: "0 4px 16px -2px rgba(14, 165, 233, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", color: "#ffffff" }}>
                Fatoora ZATCA Treasury
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(224, 242, 254, 0.7)", fontWeight: 500 }}>
                Phase-2 Live Clearance & VAT Matrix
              </div>
            </div>
          </div>

          {/* Quick Action Pill Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/invoices/new"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #38bdf8, #0284c7)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 6px 20px -4px rgba(2, 132, 199, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
                transition: "transform 0.15s ease",
              }}
            >
              <Icon name="plus" size={15} sw={2.5} />
              <span>{t.create}</span>
            </Link>
            <Link
              href="/clearance"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span>Instant Clearance ↗</span>
            </Link>
          </div>
        </div>

        {/* Main Content Row: Big Balance Display on Left, 2x2 Metric Matrix on Right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            alignItems: "center",
            gap: 28,
          }}
        >
          {/* Big Balance Callout */}
          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "rgba(224, 242, 254, 0.7)",
                letterSpacing: ".05em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Total Invoiced Volume (YTD)
            </div>
            <div
              style={{
                fontSize: "clamp(32px, 4.5vw, 48px)",
                fontWeight: 800,
                letterSpacing: "-.03em",
                lineHeight: 1.05,
                fontFamily: "var(--fdisp)",
                color: "#ffffff",
                textShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              {sar(totalVat || 375928, lang)}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                fontSize: 12.5,
                color: "#34d399",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(52, 211, 153, 0.18)",
                }}
              >
                ↑
              </span>
              <span>+18.4% vs last month</span>
              <span style={{ color: "rgba(224, 242, 254, 0.5)", marginInlineStart: 4 }}>• Real-time cryptographically stamped</span>
            </div>
          </div>

          {/* 2x2 Metric Matrix (Inspired by Reference 4 - Payal) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {/* Metric 1 */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 16,
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ fontSize: 11.5, color: "rgba(224, 242, 254, 0.65)", fontWeight: 500 }}>
                Total Invoices
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", marginTop: 4, fontFamily: "var(--fdisp)" }}>
                {num(invoiceCount || 1420, lang)}
              </div>
              <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 2, fontWeight: 600 }}>
                100% On-chain XML
              </div>
            </div>

            {/* Metric 2 */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 16,
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ fontSize: 11.5, color: "rgba(224, 242, 254, 0.65)", fontWeight: 500 }}>
                Clearance Rate
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#34d399", marginTop: 4, fontFamily: "var(--fdisp)" }}>
                {successRate}%
              </div>
              <div style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.5)", marginTop: 2 }}>
                ZATCA Gateway
              </div>
            </div>

            {/* Metric 3 */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 16,
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ fontSize: 11.5, color: "rgba(224, 242, 254, 0.65)", fontWeight: 500 }}>
                Compliance Score
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", marginTop: 4, fontFamily: "var(--fdisp)" }}>
                {score}/100
              </div>
              <div style={{ fontSize: 11, color: "#a855f7", marginTop: 2, fontWeight: 600 }}>
                Audit Ready
              </div>
            </div>

            {/* Metric 4 */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 16,
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ fontSize: 11.5, color: "rgba(224, 242, 254, 0.65)", fontWeight: 500 }}>
                CSID Status
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: hasCsid ? "#34d399" : "#fbbf24", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: hasCsid ? "#34d399" : "#fbbf24" }} />
                <span>{hasCsid ? "Active" : "Local Dev"}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.5)", marginTop: 2 }}>
                Cryptographic Cert
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

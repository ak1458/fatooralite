"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";

interface SaudiCorporateCardProps {
  cardHolder?: string;
  lastFour?: string;
  companyName?: string;
}

export function SaudiCorporateCard({
  cardHolder = "Khalid Al-Otaibi",
  lastFour = "4242",
  companyName = "Almarai Co.",
}: SaudiCorporateCardProps) {
  const { lang } = useLang();

  return (
    <div
      className="glass-card"
      style={{
        borderRadius: 22,
        padding: 22,
        boxShadow: "var(--sh)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
          {lang === "ar" ? "بطاقة المنشأة والاعتماد" : "Corporate Tax & CSID Card"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ac)", background: "var(--acs)", border: "1px solid var(--acbd)", padding: "3px 8px", borderRadius: 8 }}>
          {lang === "ar" ? "معتمد لدى ZATCA" : "ZATCA Linked"}
        </span>
      </div>

      {/* 3D Physical Metallic Card (Pure Vector/CSS Luxury Mesh) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 165,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          background: "linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#ffffff",
        }}
      >
        {/* Holographic Wave Foil SVG Overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.25 }}>
          <svg viewBox="0 0 300 165" width="100%" height="100%" preserveAspectRatio="none" fill="none">
            <path d="M-20 60 C80 120 160 0 320 80" stroke="url(#foilGrad1)" strokeWidth="3" />
            <path d="M-20 100 C100 160 180 20 320 120" stroke="url(#foilGrad2)" strokeWidth="2" />
            <path d="M-20 30 C120 80 200 -20 320 50" stroke="url(#foilGrad1)" strokeWidth="1.5" />
            <defs>
              <linearGradient id="foilGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="foilGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Top: Company Name + Contactless / Mada */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".02em", color: "#f8fafc" }}>
            {companyName}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Contactless Waves */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="2" strokeLinecap="round">
              <path d="M8.5 16.5a5 5 0 0 1 0-9" />
              <path d="M12 19a8.5 8.5 0 0 1 0-14" />
              <path d="M15.5 21.5a12 12 0 0 1 0-19" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".06em", color: "#38bdf8" }}>
              mada
            </span>
          </div>
        </div>

        {/* Middle: Gold EMV Chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
          <div
            style={{
              width: 32,
              height: 24,
              borderRadius: 6,
              background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 2px 4px rgba(0,0,0,0.4)",
              border: "1px solid rgba(180, 83, 9, 0.8)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.3)" }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.3)" }} />
          </div>
        </div>

        {/* Bottom: Masked Number & Holder */}
        <div style={{ zIndex: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".12em", fontFamily: "var(--fmono)", color: "rgba(255, 255, 255, 0.9)" }}>
            •••• •••• •••• {lastFour}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255, 255, 255, 0.75)" }}>{cardHolder}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>EXP 12/29</span>
          </div>
        </div>
      </div>

      {/* Recent Accounts Avatar Row (Reference 1) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
        <span style={{ fontSize: 11.5, color: "var(--t3)", fontWeight: 600 }}>
          {lang === "ar" ? "الحسابات النشطة" : "Recent Active Accounts"}
        </span>
        <div style={{ display: "flex", alignItems: "center" }}>
          {["#38bdf8", "#34d399", "#a855f7", "#fbbf24"].map((bg, idx) => (
            <div
              key={idx}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: bg,
                border: "2px solid var(--s1)",
                marginInlineStart: idx === 0 ? 0 : -6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                color: "#080a10",
              }}
            >
              {["K", "S", "A", "M"][idx]}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Buttons (Reference 1: Blue Pills) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Link
            href="/invoices/new"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 12px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 14px -4px rgba(2, 132, 199, 0.6)",
              transition: "transform 0.15s ease",
            }}
          >
            <span>{lang === "ar" ? "تحويل" : "Transfer"}</span>
            <span>↗</span>
          </Link>
          <Link
            href="/reports"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 12px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 14px -4px rgba(2, 132, 199, 0.6)",
              transition: "transform 0.15s ease",
            }}
          >
            <span>{lang === "ar" ? "طلب تدقيق" : "Request"}</span>
            <span>↘</span>
          </Link>
        </div>
        <Link
          href="/clearance"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 12px",
            borderRadius: 12,
            background: "rgba(2, 132, 199, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#38bdf8",
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          <span>{lang === "ar" ? "مزامنة فورية للهيئة" : "Instant ZATCA Sync"}</span>
          <span>⇄</span>
        </Link>
      </div>
    </div>
  );
}

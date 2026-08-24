"use client";
import Image from "next/image";
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
      style={{
        borderRadius: 22,
        padding: 22,
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)",
        border: "1px solid var(--bd)",
        boxShadow: "var(--sh)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>
          Corporate Tax & CSID Card
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ac)", background: "var(--acs)", padding: "3px 8px", borderRadius: 8 }}>
          ZATCA Linked
        </span>
      </div>

      {/* 3D Physical Card Visual Render (Inspired by Reference 4) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 160,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          boxShadow: "0 18px 36px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          background: "#0d1117",
        }}
      >
        <Image
          src="/images/corporate_card.jpg"
          alt="3D Corporate Card Texture"
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* Overlay subtle info */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
            color: "#ffffff",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".05em" }}>{companyName}</span>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "#38bdf8" }}>mada / VISA</span>
          </div>

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: ".08em", fontFamily: "var(--fmono)" }}>
              •••• •••• •••• {lastFour}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{cardHolder}</span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>EXP 12/29</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Pill Buttons (Transfer, Request, Swap style from Reference 4) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <Link
          href="/invoices/new"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "11px 12px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            color: "#ffffff",
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 6px 16px -4px rgba(37, 99, 235, 0.5)",
          }}
        >
          <span>Submit ZATCA</span>
          <span>↗</span>
        </Link>
        <Link
          href="/reports"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "11px 12px",
            borderRadius: 14,
            background: "var(--s2)",
            border: "1px solid var(--bd)",
            color: "var(--tx)",
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <span>Export VAT</span>
          <span>↘</span>
        </Link>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";

const SLIDES = [
  {
    title: "Optimize Clearance Workflow",
    desc: "Enable 'Automated CSID Signing' to clear B2B invoices 3.4x faster.",
    cta: "SET UP",
    href: "/integration",
  },
  {
    title: "Instant VAT Reconciliation",
    desc: "Auto-sync with Saudi GAZT ledger and flag mismatch before quarter ends.",
    cta: "AUDIT NOW",
    href: "/reports",
  },
  {
    title: "AI Compliance Autopilot",
    desc: "Run 24/7 background XML verification on every generated tax invoice.",
    cta: "ENABLE AI",
    href: "/ai",
  },
];

export function WorkflowBanner() {
  const { lang } = useLang();
  const [slide, setSlide] = useState(0);

  const prev = () => setSlide((s) => (s === 0 ? SLIDES.length - 1 : s - 1));
  const next = () => setSlide((s) => (s === SLIDES.length - 1 ? 0 : s + 1));
  const cur = SLIDES[slide];

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        background: "linear-gradient(135deg, #c7f9cc 0%, #80ed99 50%, #57cc99 100%)",
        color: "#0a2e1d",
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 200,
        boxShadow: "0 18px 40px -15px rgba(87, 204, 153, 0.4)",
      }}
    >
      {/* 3D Crystal Mountain Graphic (from Imagen 3) placed on the right */}
      <div
        style={{
          position: "absolute",
          insetInlineEnd: -10,
          bottom: -20,
          width: "48%",
          height: "105%",
          pointerEvents: "none",
          zIndex: 1,
          opacity: 0.95,
        }}
      >
        <Image
          src="/images/workflow_mountain.jpg"
          alt="3D Crystal Peak Mountain"
          fill
          sizes="(max-width: 768px) 50vw, 300px"
          style={{ objectFit: "contain", objectPosition: "bottom right" }}
        />
      </div>

      {/* Top Header: Sparkle + Title & Carousel Arrows */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>
          <span>✧</span>
          <span>{cur.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={prev}
            aria-label="Previous recommendation"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid rgba(10, 46, 29, 0.15)",
              background: "rgba(255, 255, 255, 0.4)",
              color: "#0a2e1d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ←
          </button>
          <button
            onClick={next}
            aria-label="Next recommendation"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid rgba(10, 46, 29, 0.15)",
              background: "rgba(255, 255, 255, 0.4)",
              color: "#0a2e1d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Subtext description */}
      <div style={{ maxWidth: "60%", zIndex: 2, margin: "14px 0 18px", fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: "rgba(10, 46, 29, 0.85)" }}>
        {cur.desc}
      </div>

      {/* Action Button */}
      <div style={{ zIndex: 2 }}>
        <Link
          href={cur.href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 20px",
            borderRadius: 14,
            background: "#0a2e1d",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".06em",
            textDecoration: "none",
            boxShadow: "0 6px 16px -4px rgba(10, 46, 29, 0.5)",
          }}
        >
          {cur.cta}
        </Link>
      </div>
    </div>
  );
}

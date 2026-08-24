"use client";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";

export function BentoFeatureGrid() {
  const { t } = useLang();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 18,
        marginTop: 18,
        marginBottom: 24,
      }}
    >
      {/* Bento Card 1: Build Faster / Speedometer Gauge (Inspired by Reference 2) */}
      <div
        className="glass-card glass-card-hover"
        style={{
          position: "relative",
          borderRadius: 22,
          padding: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(245, 158, 11, 0.12), transparent 60%), var(--s1)",
        }}
      >
        {/* Floating Stat Pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 12,
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24", fontFamily: "var(--fdisp)" }}>
              46.9%
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(251, 191, 36, 0.85)", fontWeight: 600 }}>
              faster clearance time
            </div>
          </div>
        </div>

        {/* 3D Speedometer Image (Generated via Imagen 3) */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -20,
            bottom: -20,
            width: 190,
            height: 190,
            pointerEvents: "none",
            opacity: 0.85,
          }}
        >
          <Image
            src="/images/speedometer_gauge.jpg"
            alt="3D Speedometer Gauge"
            fill
            sizes="190px"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            High-Speed Signing Engine
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            Sign thousands of UBL 2.1 XML invoices in milliseconds with ECDSA secp256k1 keys.
          </div>
        </div>
      </div>

      {/* Bento Card 2: Deploy with Confidence / 3D Shield Checkmark Badge (Inspired by Reference 2) */}
      <div
        className="glass-card glass-card-hover"
        style={{
          position: "relative",
          borderRadius: 22,
          padding: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(6, 182, 212, 0.14), transparent 60%), var(--s1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          {/* Floating Checklist items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                color: "#38bdf8",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              ✓ Schematron Pass
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              ✓ ZATCA Schema OK
            </span>
          </div>
        </div>

        {/* 3D Shield Checkmark Image (Generated via Imagen 3) */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -15,
            width: 175,
            height: 175,
            pointerEvents: "none",
            opacity: 0.88,
          }}
        >
          <Image
            src="/images/shield_checkmark.jpg"
            alt="3D Shield Checkmark"
            fill
            sizes="175px"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            Automated ZATCA Compliance
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            Pre-flight XML validation, cryptographic hash calculation, and QR payload encoding.
          </div>
        </div>
      </div>

      {/* Bento Card 3: AI Financial Core / 3D Neural Processor Chip (Inspired by Reference 3) */}
      <div
        className="glass-card glass-card-hover"
        style={{
          position: "relative",
          borderRadius: 22,
          padding: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(168, 85, 247, 0.14), transparent 60%), var(--s1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 8,
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              color: "#c084fc",
            }}
          >
            AI Agent v2.4
          </span>
        </div>

        {/* 3D AI Chip Image (Generated via Imagen 3) */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -15,
            width: 175,
            height: 175,
            pointerEvents: "none",
            opacity: 0.88,
          }}
        >
          <Image
            src="/images/ai_chip_processor.jpg"
            alt="3D AI Chip Processor"
            fill
            sizes="175px"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            AI VAT & Fraud Assistant
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            Deep tax intelligence, automated VAT categorisation, and conversational audit reports.
          </div>
        </div>
      </div>

      {/* Bento Card 4: Security You Can Trust / 3D Vault Lock (Inspired by Reference 3) */}
      <div
        className="glass-card glass-card-hover"
        style={{
          position: "relative",
          borderRadius: 22,
          padding: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(16, 185, 129, 0.14), transparent 60%), var(--s1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
            }}
          >
            Bank-Level HSM
          </span>
        </div>

        {/* 3D Security Vault Image (Generated via Imagen 3) */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -15,
            width: 175,
            height: 175,
            pointerEvents: "none",
            opacity: 0.88,
          }}
        >
          <Image
            src="/images/security_vault_lock.jpg"
            alt="3D Security Vault Dial"
            fill
            sizes="175px"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            Cryptographic Vault
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            AES-256 encrypted CSID store, non-repudiation audit trails, and Postgres RLS isolation.
          </div>
        </div>
      </div>
    </div>
  );
}

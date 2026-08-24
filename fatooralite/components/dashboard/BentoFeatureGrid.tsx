"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";

export function BentoFeatureGrid() {
  const { lang } = useLang();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 18,
        marginTop: 20,
        marginBottom: 20,
      }}
    >
      {/* Bento Card 1: High-Speed Signing Engine */}
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
          minHeight: 260,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(245, 158, 11, 0.16), transparent 70%), #0c1017",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Floating Stat Pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 14,
              background: "rgba(245, 158, 11, 0.14)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24", fontFamily: "var(--fdisp)" }}>
              46.9%
            </div>
            <div style={{ fontSize: 10.5, color: "#fef08a", fontWeight: 700, letterSpacing: ".02em" }}>
              {lang === "ar" ? "سرعة إنجاز مضاعفة" : "faster clearance speed"}
            </div>
          </div>
        </div>

        {/* 3D High-Speed Speedometer Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -20,
            width: 190,
            height: 190,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="speedRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fffbeb" />
              </linearGradient>
              <filter id="speedGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer Gauge Chrome Bezel */}
            <circle cx="100" cy="100" r="82" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="14" strokeDasharray="360" strokeDashoffset="90" strokeLinecap="round" />
            <circle cx="100" cy="100" r="82" stroke="url(#speedRingGrad)" strokeWidth="14" strokeDasharray="360" strokeDashoffset="180" strokeLinecap="round" filter="url(#speedGlow)" />
            {/* Precision Radial Ticks */}
            <circle cx="100" cy="100" r="66" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" strokeDasharray="3 9" />
            {/* Center Dial Hub & Metallic Needle */}
            <circle cx="100" cy="100" r="28" fill="#141924" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="2" />
            <g transform="rotate(52 100 100)">
              <polygon points="98,100 102,100 101,34 99,34" fill="#fbbf24" filter="url(#speedGlow)" />
              <circle cx="100" cy="100" r="10" fill="#1e2433" stroke="#fbbf24" strokeWidth="3" />
              <circle cx="100" cy="100" r="4" fill="#fbbf24" />
            </g>
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "محرك التوقيع الفوري" : "High-Speed Signing Engine"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.45 }}>
            {lang === "ar"
              ? "توقيع وتشفير آلاف فواتير UBL 2.1 في أجزاء من الثانية بمفاتيح ECDSA secp256k1."
              : "Sign thousands of UBL 2.1 XML invoices in milliseconds with ECDSA secp256k1 keys."}
          </div>
        </div>
      </div>

      {/* Bento Card 2: Deploy with Confidence / Shield */}
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
          minHeight: 260,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(6, 182, 212, 0.18), transparent 70%), #0c1017",
          border: "1px solid rgba(6, 182, 212, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 10,
                background: "rgba(6, 182, 212, 0.16)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
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
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.16)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
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

        {/* 3D Holographic Emerald Shield Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -15,
            width: 185,
            height: 185,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="shield3DGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="60%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id="shield3DGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer Shield Frame */}
            <path
              d="M100 20 L165 48 V105 C165 148 100 180 100 180 C100 180 35 148 35 105 V48 Z"
              fill="rgba(16, 185, 129, 0.12)"
              stroke="url(#shield3DGrad)"
              strokeWidth="4"
              filter="url(#shield3DGlow)"
            />
            {/* Inner Cybernetic Bevel */}
            <path
              d="M100 36 L150 58 V100 C150 134 100 160 100 160 C100 160 50 134 50 100 V58 Z"
              stroke="rgba(56, 189, 248, 0.45)"
              strokeWidth="2"
            />
            {/* Radiant Glowing Checkmark */}
            <path
              d="M78 102 L92 116 L126 82"
              stroke="#34d399"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#shield3DGlow)"
            />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "جاهزية تامة وضمان الامتثال" : "Deploy with Confidence"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.45 }}>
            {lang === "ar"
              ? "تدقيق استباقي وفق قواعد التحقق الرسمية لضمان قبول الفواتير من المحاولة الأولى."
              : "Pre-flight validation verifies business rules and tax equations prior to submission."}
          </div>
        </div>
      </div>

      {/* Bento Card 3: AI Copilot & Tax Intelligence */}
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
          minHeight: 260,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(168, 85, 247, 0.18), transparent 70%), #0c1017",
          border: "1px solid rgba(168, 85, 247, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 12,
              background: "rgba(168, 85, 247, 0.16)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              fontSize: 11,
              fontWeight: 700,
              color: "#c084fc",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7" }} />
            Neural AI Agent
          </div>
        </div>

        {/* 3D Silicon Processor Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -15,
            width: 185,
            height: 185,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="chip3DGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="chip3DGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Conductive Bus Traces */}
            <path d="M30 100 H60 M140 100 H170 M100 30 V60 M100 140 V170 M45 45 L70 70 M155 45 L130 70 M45 155 L70 130 M155 155 L130 130" stroke="rgba(192, 132, 252, 0.5)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="30" cy="100" r="4" fill="#c084fc" />
            <circle cx="170" cy="100" r="4" fill="#38bdf8" />
            <circle cx="100" cy="30" r="4" fill="#c084fc" />
            <circle cx="100" cy="170" r="4" fill="#38bdf8" />
            {/* Silicon Die */}
            <rect x="60" y="60" width="80" height="80" rx="18" fill="#141924" stroke="url(#chip3DGrad)" strokeWidth="3.5" filter="url(#chip3DGlow)" />
            {/* Holographic Pulse Core */}
            <circle cx="100" cy="100" r="22" fill="rgba(192, 132, 252, 0.15)" stroke="#c084fc" strokeWidth="1.5" />
            <path d="M86 100 L95 91 L105 109 L114 100" stroke="#f0abfc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "مساعد الذكاء الاصطناعي الضريبي" : "AI Tax & Compliance Copilot"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.45 }}>
            {lang === "ar"
              ? "تحليل الفروقات الضريبية تلقائياً واكتشاف الشذوذ المحاسبي في الوقت الفعلي."
              : "Autonomous tax disparity detection, invoice anomaly alerts, and automated Q-filing."}
          </div>
        </div>
      </div>

      {/* Bento Card 4: Hardware Security & HSM Vault */}
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
          minHeight: 260,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(16, 185, 129, 0.16), transparent 70%), #0c1017",
          border: "1px solid rgba(16, 185, 129, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              fontSize: 11,
              fontWeight: 700,
              color: "#34d399",
            }}
          >
            🔐 256-Bit HSM Vault
          </div>
        </div>

        {/* 3D Titanium Vault Dial Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -15,
            bottom: -20,
            width: 190,
            height: 190,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="vault3DGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="vault3DGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer Beveled Ring */}
            <circle cx="100" cy="100" r="76" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="12" />
            <circle cx="100" cy="100" r="76" stroke="url(#vault3DGrad)" strokeWidth="12" strokeDasharray="40 20 60 15" strokeLinecap="round" filter="url(#vault3DGlow)" />
            {/* Notched Dial Calibration */}
            <circle cx="100" cy="100" r="56" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2.5" strokeDasharray="2 10" />
            {/* Titanium Hub */}
            <circle cx="100" cy="100" r="36" fill="#141924" stroke="url(#vault3DGrad)" strokeWidth="2.5" />
            {/* Emerald Core LED */}
            <circle cx="100" cy="94" r="5" fill="#34d399" filter="url(#vault3DGlow)" />
            <polygon points="97,94 103,94 104,108 96,108" fill="#34d399" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "خزنة التشفير البنكية" : "Bank-Grade Key Vault"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.45 }}>
            {lang === "ar"
              ? "حماية وتخزين شهادات CSID والمفاتيح الخاصة بتشفير AES-256 المقاوم للاختراق."
              : "Encrypted CSID private key custody secured in dedicated cryptographic hardware modules."}
          </div>
        </div>
      </div>
    </div>
  );
}

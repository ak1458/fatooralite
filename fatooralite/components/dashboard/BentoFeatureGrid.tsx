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
        marginTop: 18,
        marginBottom: 24,
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
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(245, 158, 11, 0.12), transparent 60%), var(--s1)",
        }}
      >
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
              {lang === "ar" ? "سرعة مضاعفة في الفوترة" : "faster clearance speed"}
            </div>
          </div>
        </div>

        {/* 3D High-Speed Gauge Vector Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
            bottom: -15,
            width: 170,
            height: 170,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
              <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer Ring & Ticks */}
            <circle cx="80" cy="80" r="62" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="10" strokeDasharray="260" strokeDashoffset="65" strokeLinecap="round" />
            <circle cx="80" cy="80" r="62" stroke="url(#gaugeGrad)" strokeWidth="10" strokeDasharray="260" strokeDashoffset="120" strokeLinecap="round" filter="url(#gaugeGlow)" />
            {/* Inner Scale Lines */}
            <circle cx="80" cy="80" r="48" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" strokeDasharray="3 7" />
            {/* Needle */}
            <g transform="rotate(45 80 80)">
              <line x1="80" y1="80" x2="132" y2="80" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" filter="url(#gaugeGlow)" />
              <circle cx="80" cy="80" r="9" fill="#141924" stroke="#fbbf24" strokeWidth="2.5" />
              <circle cx="80" cy="80" r="4" fill="#fbbf24" />
            </g>
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            {lang === "ar" ? "محرك التوقيع فائق السرعة" : "High-Speed Signing Engine"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            {lang === "ar"
              ? "توقيع آلاف فواتير UBL 2.1 XML في أجزاء من الثانية بمفاتيح ECDSA secp256k1."
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
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(6, 182, 212, 0.14), transparent 60%), var(--s1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
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

        {/* 3D Shield Vector Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
            bottom: -10,
            width: 165,
            height: 165,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path
              d="M80 20 L130 40 V85 C130 118 80 145 80 145 C80 145 30 118 30 85 V40 Z"
              fill="rgba(6, 182, 212, 0.1)"
              stroke="url(#shieldGrad)"
              strokeWidth="3.5"
              filter="url(#shieldGlow)"
            />
            <path
              d="M80 34 L118 50 V82 C118 107 80 128 80 128 C80 128 42 107 42 82 V50 Z"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1.5"
            />
            {/* Glowing Checkmark */}
            <path
              d="M62 82 L74 94 L100 68"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#shieldGlow)"
            />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            {lang === "ar" ? "جاهزية تامة وثقة في الامتثال" : "Deploy with Confidence"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            {lang === "ar"
              ? "فحص وتدقيق كل فاتورة وفق لوائح الهيئة الرسمية لضمان عدم رفض أي معاملة."
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
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(168, 85, 247, 0.14), transparent 60%), var(--s1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              fontSize: 11,
              fontWeight: 700,
              color: "#c084fc",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7" }} />
            Neural AI Agent
          </div>
        </div>

        {/* 3D AI Chip Vector Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
            bottom: -15,
            width: 170,
            height: 170,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="chipGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M25 80 H50 M110 80 H135 M80 25 V50 M80 110 V135" stroke="rgba(192, 132, 252, 0.4)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="25" cy="80" r="3" fill="#c084fc" />
            <circle cx="135" cy="80" r="3" fill="#38bdf8" />
            <circle cx="80" cy="25" r="3" fill="#c084fc" />
            <circle cx="80" cy="135" r="3" fill="#38bdf8" />
            <rect x="50" y="50" width="60" height="60" rx="14" fill="#141924" stroke="url(#chipGrad)" strokeWidth="3" filter="url(#chipGlow)" />
            <path d="M68 80 L76 72 L84 88 L92 80" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            {lang === "ar" ? "مساعد الذكاء الاصطناعي الضريبي" : "AI Tax & Compliance Copilot"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            {lang === "ar"
              ? "تحليل الفروقات الضريبية تلقائياً واقتراح التصحيحات الفورية للفواتير."
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
          minHeight: 250,
          background: "radial-gradient(100% 100% at 100% 0%, rgba(16, 185, 129, 0.12), transparent 60%), var(--s1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: 11,
              fontWeight: 700,
              color: "#34d399",
            }}
          >
            🔐 256-Bit HSM Vault
          </div>
        </div>

        {/* 3D Security Vault Dial Vector Graphic */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
            bottom: -15,
            width: 170,
            height: 170,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none">
            <defs>
              <linearGradient id="vaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <filter id="vaultGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="80" cy="80" r="58" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="8" />
            <circle cx="80" cy="80" r="58" stroke="url(#vaultGrad)" strokeWidth="8" strokeDasharray="30 15 45 10" strokeLinecap="round" filter="url(#vaultGlow)" />
            <circle cx="80" cy="80" r="44" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeDasharray="2 8" />
            <circle cx="80" cy="80" r="28" fill="#141924" stroke="url(#vaultGrad)" strokeWidth="2" />
            <circle cx="80" cy="76" r="4" fill="#34d399" />
            <polygon points="78,76 82,76 83,86 77,86" fill="#34d399" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 40, maxWidth: "75%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.01em" }}>
            {lang === "ar" ? "خزنة التشفير البنكية" : "Bank-Grade Key Vault"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 6, lineHeight: 1.4 }}>
            {lang === "ar"
              ? "حماية وتخزين شهادات CSID والمفاتيح الخاصة بتشفير AES-256 المقاوم للاختراق."
              : "Encrypted CSID private key custody secured in dedicated cryptographic hardware modules."}
          </div>
        </div>
      </div>
    </div>
  );
}

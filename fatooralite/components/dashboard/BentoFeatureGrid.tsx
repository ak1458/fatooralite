"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LangProvider";

/** Dynamic Speedometer Component that smoothly responds to percentage and shifts color gradient */
function DynamicSpeedometer({ targetPct = 46.9 }: { targetPct?: number }) {
  const [currentPct, setCurrentPct] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    const dur = 1400;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setCurrentPct(targetPct * ease);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [targetPct]);

  // Interactive value on hover
  const displayPct = isHovered ? Math.min(100, currentPct + 18.5) : currentPct;

  // Dynamic Needle angle from -120deg (at 0%) to +120deg (at 100%)
  const needleAngle = -120 + (Math.min(Math.max(displayPct, 0), 100) / 100) * 240;

  // Dynamic Color tier: Amber < 35% -> Cyan 35%-75% -> Emerald > 75%
  const activeColor =
    displayPct < 35 ? "#f59e0b" : displayPct < 75 ? "#00f2ff" : "#10b981";
  const glowColor =
    displayPct < 35
      ? "rgba(245, 158, 11, 0.4)"
      : displayPct < 75
      ? "rgba(0, 242, 255, 0.4)"
      : "rgba(16, 185, 129, 0.4)";

  // Arc Dash calculation for 240deg sweep (circumference 2 * pi * 82 ≈ 515.2, 240deg fraction = 343.5)
  const totalArc = 343.5;
  const arcOffset = totalArc * (1 - displayPct / 100);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "absolute",
        insetInlineEnd: -10,
        bottom: -15,
        width: 195,
        height: 195,
        cursor: "pointer",
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="dynSpeedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#00f2ff" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="dynSpeedGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track Arc (240 degrees) */}
        <circle
          cx="100"
          cy="100"
          r="82"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="12"
          strokeDasharray="343.5 171.7"
          strokeDashoffset="-85.8"
          strokeLinecap="round"
        />

        {/* Dynamic Glowing Filled Arc */}
        <circle
          cx="100"
          cy="100"
          r="82"
          stroke="url(#dynSpeedGrad)"
          strokeWidth="12"
          strokeDasharray="343.5 171.7"
          strokeDashoffset={-85.8 + arcOffset}
          strokeLinecap="round"
          filter="url(#dynSpeedGlow)"
          style={{ transition: "stroke-dashoffset 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />

        {/* Precision Radial Ticks */}
        <circle
          cx="100"
          cy="100"
          r="66"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
          strokeDasharray="2 10"
        />

        {/* Center Hub */}
        <circle cx="100" cy="100" r="26" fill="#0e121d" stroke={activeColor} strokeWidth="2" />
        <circle cx="100" cy="100" r="14" fill="#161b2a" />

        {/* Dynamic Animated Needle */}
        <g
          style={{
            transformOrigin: "100px 100px",
            transform: `rotate(${needleAngle}deg)`,
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <polygon points="98,100 102,100 101,28 99,28" fill={activeColor} filter="url(#dynSpeedGlow)" />
          <circle cx="100" cy="100" r="7" fill={activeColor} style={{ boxShadow: `0 0 10px ${glowColor}` }} />
        </g>
      </svg>
    </div>
  );
}

export function BentoFeatureGrid() {
  const { lang } = useLang();
  const [speedVal, setSpeedVal] = useState(46.9);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
        marginTop: 18,
        marginBottom: 18,
      }}
    >
      {/* Bento Card 1: Dynamic High-Speed Signing Engine */}
      <div
        className="glass-card glass-card-hover"
        style={{
          position: "relative",
          borderRadius: 16,
          padding: "22px 24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(0, 242, 255, 0.12), transparent 70%), #0c1017",
          border: "1px solid rgba(0, 242, 255, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Dynamic Stat Pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              padding: "7px 12px",
              borderRadius: 10,
              background: "rgba(0, 242, 255, 0.12)",
              border: "1px solid rgba(0, 242, 255, 0.35)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 19, fontWeight: 800, color: "#00f2ff", fontFamily: "var(--fdisp)" }}>
              {speedVal.toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: "#74f5ff", fontWeight: 700, letterSpacing: ".02em" }}>
              {lang === "ar" ? "سرعة إنجاز مضاعفة" : "faster clearance speed"}
            </div>
          </div>
        </div>

        {/* Dynamic Responsive Speedometer */}
        <DynamicSpeedometer targetPct={speedVal} />

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 36, maxWidth: "76%" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "محرك التوقيع الفوري" : "High-Speed Signing Engine"}
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 5, lineHeight: 1.45 }}>
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
          borderRadius: 16,
          padding: "22px 24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(16, 185, 129, 0.14), transparent 70%), #0c1017",
          border: "1px solid rgba(16, 185, 129, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 8,
                background: "rgba(56, 189, 248, 0.14)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
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
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.14)",
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

        {/* 3D Holographic Emerald Shield */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
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
            <path
              d="M100 20 L165 48 V105 C165 148 100 180 100 180 C100 180 35 148 35 105 V48 Z"
              fill="rgba(16, 185, 129, 0.12)"
              stroke="url(#shield3DGrad)"
              strokeWidth="3.5"
              filter="url(#shield3DGlow)"
            />
            <path
              d="M100 36 L150 58 V100 C150 134 100 160 100 160 C100 160 50 134 50 100 V58 Z"
              stroke="rgba(56, 189, 248, 0.45)"
              strokeWidth="1.8"
            />
            <path
              d="M78 102 L92 116 L126 82"
              stroke="#34d399"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#shield3DGlow)"
            />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 36, maxWidth: "76%" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "جاهزية تامة وضمان الامتثال" : "Deploy with Confidence"}
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 5, lineHeight: 1.45 }}>
            {lang === "ar"
              ? "تدقيق استباقي وفق قواعد التحقق الرسمية لضمان قبول الفواتير من المحاولة الأولى."
              : "Pre-flight validation verifies business rules and tax equations prior to submission."}
          </div>
        </div>
      </div>

      {/* Bento Card 3: AI Copilot with Hover Pulsing Circuit */}
      <div
        className="glass-card glass-card-hover"
        style={{
          position: "relative",
          borderRadius: 16,
          padding: "22px 24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(168, 85, 247, 0.16), transparent 70%), #0c1017",
          border: "1px solid rgba(168, 85, 247, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 10,
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              fontSize: 10.5,
              fontWeight: 700,
              color: "#c084fc",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7" }} />
            Neural AI Agent
          </div>
        </div>

        {/* 3D Silicon Processor with hover circuit pulse */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
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
            {/* Pulsing Conductive Bus Traces */}
            <g style={{ animation: "circuitPulse 3s ease-in-out infinite" }}>
              <path d="M30 100 H60 M140 100 H170 M100 30 V60 M100 140 V170 M45 45 L70 70 M155 45 L130 70 M45 155 L70 130 M155 155 L130 130" stroke="rgba(192, 132, 252, 0.7)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="30" cy="100" r="4" fill="#c084fc" />
              <circle cx="170" cy="100" r="4" fill="#38bdf8" />
              <circle cx="100" cy="30" r="4" fill="#c084fc" />
              <circle cx="100" cy="170" r="4" fill="#38bdf8" />
            </g>
            <rect x="62" y="62" width="76" height="76" rx="14" fill="#141924" stroke="url(#chip3DGrad)" strokeWidth="3" filter="url(#chip3DGlow)" />
            <circle cx="100" cy="100" r="20" fill="rgba(192, 132, 252, 0.15)" stroke="#c084fc" strokeWidth="1.5" />
            <path d="M88 100 L96 92 L104 108 L112 100" stroke="#f0abfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 36, maxWidth: "76%" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "مساعد الذكاء الاصطناعي الضريبي" : "AI Tax & Compliance Copilot"}
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 5, lineHeight: 1.45 }}>
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
          borderRadius: 16,
          padding: "22px 24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 250,
          background: "radial-gradient(120% 120% at 100% 0%, rgba(16, 185, 129, 0.14), transparent 70%), #0c1017",
          border: "1px solid rgba(16, 185, 129, 0.22)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 2 }}>
          <div
            style={{
              padding: "5px 10px",
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.14)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              fontSize: 10.5,
              fontWeight: 700,
              color: "#34d399",
            }}
          >
            🔐 256-Bit HSM Vault
          </div>
        </div>

        {/* 3D Titanium Vault Dial */}
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
            bottom: -15,
            width: 185,
            height: 185,
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
            <circle cx="100" cy="100" r="76" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="10" />
            <circle cx="100" cy="100" r="76" stroke="url(#vault3DGrad)" strokeWidth="10" strokeDasharray="40 20 60 15" strokeLinecap="round" filter="url(#vault3DGlow)" />
            <circle cx="100" cy="100" r="56" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" strokeDasharray="2 10" />
            <circle cx="100" cy="100" r="34" fill="#141924" stroke="url(#vault3DGrad)" strokeWidth="2" />
            <circle cx="100" cy="94" r="4.5" fill="#34d399" filter="url(#vault3DGlow)" />
            <polygon points="97,94 103,94 104,108 96,108" fill="#34d399" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ zIndex: 2, marginTop: 36, maxWidth: "76%" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", letterSpacing: "-.015em" }}>
            {lang === "ar" ? "خزنة التشفير البنكية" : "Bank-Grade Key Vault"}
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 5, lineHeight: 1.45 }}>
            {lang === "ar"
              ? "حماية وتخزين شهادات CSID والمفاتيح الخاصة بتشفير AES-256 المقاوم للاختراق."
              : "Encrypted CSID private key custody secured in dedicated cryptographic hardware modules."}
          </div>
        </div>
      </div>
    </div>
  );
}

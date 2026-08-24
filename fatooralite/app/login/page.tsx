"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";

const L = {
  title: { en: "Welcome Back", ar: "مرحباً بعودتك" },
  sub: { en: "Sign in to access your ZATCA Phase-2 portal", ar: "سجل الدخول للوصول إلى بوابة الامتثال للمرحلة الثانية" },
  email: { en: "Work Email", ar: "البريد الإلكتروني للعمل" },
  password: { en: "Password", ar: "كلمة المرور" },
  signin: { en: "Sign in to Portal", ar: "تسجيل الدخول إلى البوابة" },
  signing: { en: "Authenticating…", ar: "جارٍ التحقق…" },
  quickDemo: { en: "Quick Demo Credentials", ar: "بيانات الدخول التجريبية" },
  demoOwner: { en: "Almarai Owner", ar: "مالك المراعي" },
  demoAcc: { en: "Accountant", ar: "محاسب" },
  heroBadge: { en: "ZATCA PHASE-2 COMPLIANT", ar: "معتمد من هيئة الزكاة والضريبة" },
  heroHeadline: { en: "Next-Gen Saudi E-Invoicing & Cryptographic Clearance", ar: "الجيل القادم من الفوترة الإلكترونية والامتثال الضريبي" },
  heroSub: {
    en: "Automate XML clearance, CSID certificate lifecycle, and real-time ZATCA reporting with sub-second latency.",
    ar: "أتمتة الفوترة المعتمدة وإدارة شهادات الامتثال والربط المباشر مع الهيئة بسرعة فائقة.",
  },
  stat1Val: { en: "99.98%", ar: "٩٩.٩٨٪" },
  stat1Lbl: { en: "Clearance Rate", ar: "معدل الاعتماد" },
  stat2Val: { en: "< 120ms", ar: "< ١٢٠مللي ثانية" },
  stat2Lbl: { en: "ZATCA Latency", ar: "سرعة المعالجة" },
  stat3Val: { en: "256-Bit", ar: "٢٥٦-بت" },
  stat3Lbl: { en: "ECDSA Encryption", ar: "تشفير التوقيع" },
};

function LoginForm() {
  const { lang, setLang } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const params = useSearchParams();
  const expired = params.get("expired") === "1";
  const justRegistered = params.get("registered") === "1";
  const t = (k: keyof typeof L) => L[k][lang];

  function fillDemo(type: "owner" | "accountant") {
    if (type === "owner") {
      setEmail("khalid@almarai.example");
      setPassword("owner1234");
    } else {
      setEmail("sara@almarai.example");
      setPassword("acc1234");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Left Visual Hero Pane (Desktop / Tablet) */}
      <div
        style={{
          flex: "1 1 50%",
          position: "relative",
          display: "none",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          background: "radial-gradient(100% 100% at 0% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 60%), radial-gradient(100% 100% at 100% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), #07090e",
          borderInlineEnd: "1px solid var(--bd)",
          overflow: "hidden",
        }}
        className="auth-hero-pane"
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "20%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Top Branding */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(150deg, #38bdf8, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px -6px rgba(56, 189, 248, 0.5)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--fdisp)", letterSpacing: "-.02em" }}>
              Fatoora Lite Pro
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ac)", fontWeight: 600, letterSpacing: ".04em" }}>
              {t("heroBadge")}
            </div>
          </div>
        </div>

        {/* 3D Cryptographic Vault Showcase Card */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            margin: "32px 0",
            borderRadius: 24,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), #0c1017",
            boxShadow: "0 30px 60px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: 260, overflow: "hidden" }}>
            <Image
              src="/images/auth_vault_hero.jpg"
              alt="Cryptographic Vault"
              fill
              priority
              style={{ objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, #0c1017 0%, transparent 60%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 14,
                insetInlineStart: 14,
                padding: "6px 12px",
                borderRadius: 20,
                background: "rgba(7, 9, 14, 0.75)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                fontSize: 11,
                fontWeight: 700,
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }} />
              HSM Key Vault Active
            </div>
          </div>

          <div style={{ padding: "20px 24px" }}>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "var(--fdisp)",
                letterSpacing: "-.02em",
                lineHeight: 1.3,
              }}
            >
              {t("heroHeadline")}
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--t2)", lineHeight: 1.6 }}>
              {t("heroSub")}
            </p>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            padding: "16px 20px",
            borderRadius: 18,
            border: "1px solid var(--bd)",
            background: "rgba(14, 18, 26, 0.7)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--fdisp)", color: "#10b981" }}>
              {t("stat1Val")}
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, fontWeight: 500 }}>
              {t("stat1Lbl")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--fdisp)", color: "#38bdf8" }}>
              {t("stat2Val")}
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, fontWeight: 500 }}>
              {t("stat2Lbl")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--fdisp)", color: "#a855f7" }}>
              {t("stat3Val")}
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, fontWeight: 500 }}>
              {t("stat3Lbl")}
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Pane */}
      <div
        style={{
          flex: "1 1 50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px 24px",
          overflowY: "auto",
          maxWidth: "100%",
        }}
      >
        {/* Top Utilities (Language toggle) */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, maxWidth: 440, width: "100%", margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
              color: "var(--tx)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🌐</span>
            <span>{lang === "en" ? "العربية" : "English"}</span>
          </button>
        </div>

        {/* Main Form Glass Card */}
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            margin: "auto",
            padding: "36px 32px",
            borderRadius: 24,
            border: "1px solid var(--bd)",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)",
            boxShadow: "0 24px 50px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 26 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 16,
                background: "var(--acs)",
                border: "1px solid var(--acbd)",
                color: "var(--ac)",
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              <span>🔐</span>
              <span>ZATCA Phase-2 Security Portal</span>
            </div>
            <h1
              style={{
                margin: "0 0 6px 0",
                fontSize: 26,
                fontWeight: 800,
                fontFamily: "var(--fdisp)",
                letterSpacing: "-.025em",
                color: "var(--tx)",
              }}
            >
              {t("title")}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--t3)", lineHeight: 1.5 }}>
              {t("sub")}
            </p>
          </div>

          {/* Quick 1-Click Demo Credentials Pills */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(56, 189, 248, 0.06)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              marginBottom: 22,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#38bdf8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚡</span>
              <span>{t("quickDemo")}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => fillDemo("owner")}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  background: "var(--s1)",
                  color: "var(--tx)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                }}
              >
                👔 {t("demoOwner")}
              </button>
              <button
                type="button"
                onClick={() => fillDemo("accountant")}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  background: "var(--s1)",
                  color: "var(--tx)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                }}
              >
                📊 {t("demoAcc")}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit}>
            {/* Email Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>
                {t("email")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    paddingInlineStart: 38,
                    borderRadius: 12,
                    border: "1px solid var(--bd)",
                    background: "var(--s2)",
                    color: "var(--tx)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    insetInlineStart: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--t3)",
                    display: "flex",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t2)" }}>
                  {t("password")}
                </label>
                <Link
                  href="/forgot"
                  style={{ fontSize: 12, color: "var(--ac)", textDecoration: "none", fontWeight: 600 }}
                >
                  {lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    paddingInlineStart: 38,
                    paddingInlineEnd: 38,
                    borderRadius: 12,
                    border: "1px solid var(--bd)",
                    background: "var(--s2)",
                    color: "var(--tx)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    insetInlineStart: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--t3)",
                    display: "flex",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    insetInlineEnd: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--t3)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Feedback Alerts */}
            {justRegistered && !error && (
              <div
                role="status"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--acs)",
                  border: "1px solid var(--acbd)",
                  color: "var(--ac)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {lang === "ar"
                  ? "✓ تم إنشاء شركتك بنجاح! الرجاء تسجيل الدخول للمتابعة."
                  : "✓ Company registered successfully! Sign in to continue."}
              </div>
            )}

            {expired && !error && (
              <div
                role="status"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--warns)",
                  border: "1px solid var(--warnbd, var(--bd))",
                  color: "var(--warn)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {lang === "ar"
                  ? "⚠️ انتهت صلاحية جلستك. الرجاء إعادة تسجيل الدخول."
                  : "⚠️ Your session expired. Please sign in again."}
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--dangs)",
                  border: "1px solid var(--dangbd, var(--bd))",
                  color: "var(--dang)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                ✕ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(150deg, var(--acb), var(--ac))",
                color: "var(--on-ac)",
                fontSize: 14,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: busy ? 0.75 : 1,
                boxShadow: "0 10px 25px -8px var(--ac)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {busy ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "flSpin 0.8s linear infinite",
                    }}
                  />
                  <span>{t("signing")}</span>
                </>
              ) : (
                <>
                  <span>{t("signin")}</span>
                  <span style={{ fontSize: 16 }}>→</span>
                </>
              )}
            </button>
          </form>

          {/* Create Company Register Link */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--bd)", fontSize: 13, color: "var(--t3)", textAlign: "center" }}>
            {lang === "ar" ? "ليس لديك حساب منشأة؟ " : "Don't have a company account? "}
            <Link
              href="/register"
              style={{ color: "var(--ac)", fontWeight: 700, textDecoration: "none" }}
            >
              {lang === "ar" ? "تسجيل منشأة جديدة ←" : "Register Company →"}
            </Link>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div style={{ maxWidth: 440, width: "100%", margin: "0 auto", textAlign: "center", fontSize: 11.5, color: "var(--t3)" }}>
          <span>🔒 Kingdom of Saudi Arabia ZATCA Phase-2 Standard • 256-Bit TLS</span>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 960px) {
          .auth-hero-pane {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

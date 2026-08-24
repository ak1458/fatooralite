"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";

export default function RegisterPage() {
  const { lang, setLang } = useLang();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "", vatNumber: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, acceptedTerms }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string; accountCreated?: boolean });
      if (!res.ok) throw new Error(data.error || `Registration failed (${res.status})`);
      if (data.accountCreated && !data.user) {
        router.push("/login?registered=1");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
      {/* Left Visual Hero Pane */}
      <div
        style={{
          flex: "1 1 45%",
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
              ZATCA PHASE-2 ENTERPRISE
            </div>
          </div>
        </div>

        {/* 3D Cryptographic Vault Showcase Card */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            margin: "24px 0",
            borderRadius: 24,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), #0c1017",
            boxShadow: "0 30px 60px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: 220, overflow: "hidden" }}>
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
              }}
            >
              🚀 Instant Saudi Onboarding
            </div>
          </div>

          <div style={{ padding: "18px 22px" }}>
            <h2
              style={{
                margin: "0 0 6px 0",
                fontSize: 20,
                fontWeight: 800,
                fontFamily: "var(--fdisp)",
                letterSpacing: "-.02em",
              }}
            >
              {lang === "ar" ? "ابدأ فوترتك المعتمدة اليوم" : "Join Leading Saudi Enterprises"}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
              {lang === "ar"
                ? "اربط منشأتك مع هيئة الزكاة والضريبة والجمارك في أقل من ٥ دقائق مع الامتثال الكامل للمرحلة الثانية."
                : "Connect your business directly to ZATCA Fatoora Phase-2 in under 5 minutes with zero compliance overhead."}
            </p>
          </div>
        </div>

        {/* Feature Checkpoints */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--t2)" }}>
            <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
            <span>{lang === "ar" ? "إصدار شهادات CSID المعتمدة تلقائياً" : "Automated CSID Production Certificates"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--t2)" }}>
            <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
            <span>{lang === "ar" ? "توقيع وتشفير ECDSA والرمز المربع QR" : "ECDSA Cryptographic Stamping & Phase-2 QR"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--t2)" }}>
            <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
            <span>{lang === "ar" ? "مساعد الذكاء الاصطناعي للفحص والتدقيق" : "AI Tax Assistant & Discrepancy Auditing"}</span>
          </div>
        </div>
      </div>

      {/* Right Form Pane */}
      <div
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "36px 24px",
          overflowY: "auto",
        }}
      >
        {/* Top Utilities */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", maxWidth: 480, width: "100%", margin: "0 auto" }}>
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

        {/* Form Container */}
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            margin: "auto",
            padding: "32px 30px",
            borderRadius: 24,
            border: "1px solid var(--bd)",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)",
            boxShadow: "0 24px 50px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
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
                marginBottom: 10,
              }}
            >
              <span>🏢</span>
              <span>{lang === "ar" ? "تسجيل منشأة جديدة" : "New Company Account"}</span>
            </div>
            <h1
              style={{
                margin: "0 0 4px 0",
                fontSize: 24,
                fontWeight: 800,
                fontFamily: "var(--fdisp)",
                letterSpacing: "-.025em",
                color: "var(--tx)",
              }}
            >
              {lang === "ar" ? "أنشئ حساب منشأتك" : "Create your company"}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--t3)" }}>
              {lang === "ar" ? "ابدأ بإصدار الفواتير المعتمدة لـ ZATCA" : "Start issuing ZATCA-compliant invoices"}
            </p>
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
                {lang === "ar" ? "اسم المسؤول" : "Your name"}
              </label>
              <input
                value={form.name}
                onChange={set("name")}
                placeholder="Khalid Al-Otaibi"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--bd)",
                  background: "var(--s2)",
                  color: "var(--tx)",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  outline: "none",
                }}
                required
                autoComplete="name"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
                  {lang === "ar" ? "البريد الإلكتروني" : "Work email"}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="khalid@company.com"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--bd)",
                    background: "var(--s2)",
                    color: "var(--tx)",
                    fontSize: 13.5,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
                  {lang === "ar" ? "كلمة المرور" : "Password"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--bd)",
                    background: "var(--s2)",
                    color: "var(--tx)",
                    fontSize: 13.5,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
                {lang === "ar" ? "اسم المنشأة / الشركة" : "Company name"}
              </label>
              <input
                value={form.companyName}
                onChange={set("companyName")}
                placeholder="Almarai Trading Co."
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--bd)",
                  background: "var(--s2)",
                  color: "var(--tx)",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  outline: "none",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>
                {lang === "ar" ? "الرقم الضريبي (١٥ رقماً)" : "VAT number (15 digits)"}
              </label>
              <input
                value={form.vatNumber}
                onChange={set("vatNumber")}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--bd)",
                  background: "var(--s2)",
                  color: "var(--tx)",
                  fontSize: 13.5,
                  fontFamily: "var(--fmono)",
                  outline: "none",
                }}
                required
                inputMode="numeric"
                maxLength={15}
                placeholder="300000000000003"
              />
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: 3, accentColor: "var(--ac)" }}
                required
              />
              <span style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.5 }}>
                {lang === "ar" ? "أوافق على " : "I agree to the "}
                <Link href="/terms" target="_blank" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
                  {lang === "ar" ? "شروط الخدمة" : "Terms of Service"}
                </Link>{" "}
                {lang === "ar" ? "و" : "and"}{" "}
                <Link href="/privacy" target="_blank" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
                  {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
                </Link>
              </span>
            </label>

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

            <button
              type="submit"
              disabled={busy || !acceptedTerms}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(150deg, var(--acb), var(--ac))",
                color: "var(--on-ac)",
                fontSize: 14,
                fontWeight: 700,
                cursor: busy ? "wait" : !acceptedTerms ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: busy || !acceptedTerms ? 0.7 : 1,
                boxShadow: "0 10px 25px -8px var(--ac)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {busy
                ? (lang === "ar" ? "جارٍ إنشاء الحساب…" : "Creating account…")
                : (lang === "ar" ? "إنشاء حساب المنشأة →" : "Create account →")}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--bd)", fontSize: 13, color: "var(--t3)", textAlign: "center" }}>
            {lang === "ar" ? "لديك حساب بالفعل؟ " : "Already have an account? "}
            <Link href="/login" style={{ color: "var(--ac)", fontWeight: 700, textDecoration: "none" }}>
              {lang === "ar" ? "تسجيل الدخول ←" : "Sign in →"}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ maxWidth: 480, width: "100%", margin: "0 auto", textAlign: "center", fontSize: 11.5, color: "var(--t3)" }}>
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

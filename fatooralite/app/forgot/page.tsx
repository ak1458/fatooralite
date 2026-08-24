"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";

const L = {
  title: { en: "Reset your password", ar: "إعادة تعيين كلمة المرور" },
  sub: { en: "Enter your email to request a reset link", ar: "أدخل بريدك الإلكتروني لطلب رابط إعادة التعيين" },
  email: { en: "Work Email", ar: "البريد الإلكتروني للعمل" },
  submit: { en: "Send reset link", ar: "إرسال رابط إعادة التعيين" },
  sending: { en: "Sending…", ar: "جاري الإرسال…" },
  success: {
    en: "If the email exists in our system, a password reset link has been logged/sent.",
    ar: "إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال رابط إعادة تعيين كلمة المرور.",
  },
  backToLogin: { en: "Back to login", ar: "العودة لتسجيل الدخول" },
};

export default function ForgotPage() {
  const { lang, setLang } = useLang();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const t = (k: keyof typeof L) => L[k][lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(100% 100% at 50% 0%, rgba(56, 189, 248, 0.1) 0%, transparent 60%), var(--bg)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: 36,
          border: "1px solid var(--bd)",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)",
          boxShadow: "0 24px 50px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px -6px var(--ac)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--on-ac)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            style={{
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid var(--bd)",
              background: "var(--s2)",
              color: "var(--tx)",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 6px 0", fontSize: 22, fontWeight: 800, fontFamily: "var(--fdisp)", letterSpacing: "-.02em" }}>
            {t("title")}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--t3)", lineHeight: 1.5 }}>
            {t("sub")}
          </p>
        </div>

        {success ? (
          <div>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: "var(--acs)",
                border: "1px solid var(--acbd)",
                color: "var(--ac)",
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              ✓ {t("success")}
            </div>
            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 18px",
                borderRadius: 12,
                border: "1px solid var(--bd)",
                background: "var(--s2)",
                color: "var(--tx)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              ← {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>
                {t("email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--bd)",
                  background: "var(--s2)",
                  color: "var(--tx)",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                }}
                required
              />
            </div>

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
              disabled={busy}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(150deg,var(--acb),var(--ac))",
                color: "var(--on-ac)",
                fontSize: 14,
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
                fontFamily: "inherit",
                opacity: busy ? 0.7 : 1,
                boxShadow: "0 10px 25px -8px var(--ac)",
                marginBottom: 16,
              }}
            >
              {busy ? t("sending") : t("submit")}
            </button>

            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 13,
                color: "var(--ac)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← {t("backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

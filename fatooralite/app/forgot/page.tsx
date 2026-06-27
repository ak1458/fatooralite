"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";

const L = {
  title: { en: "Reset your password", ar: "إعادة تعيين كلمة المرور" },
  sub: { en: "Enter your email to request a reset link", ar: "أدخل بريدك الإلكتروني لطلب رابط إعادة التعيين" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  submit: { en: "Send reset link", ar: "إرسال رابط إعادة التعيين" },
  sending: { en: "Sending…", ar: "جاري الإرسال…" },
  success: {
    en: "If the email exists in our system, a password reset link has been logged/sent.",
    ar: "إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال رابط إعادة تعيين كلمة المرور.",
  },
  backToLogin: { en: "Back to login", ar: "العودة لتسجيل الدخول" },
};

export default function ForgotPage() {
  const { lang } = useLang();
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 11,
    border: "1px solid var(--bd)",
    background: "var(--s2)",
    color: "var(--tx)",
    fontSize: 14,
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 20,
          padding: 30,
          border: "1px solid var(--bd)",
          background: "var(--s1)",
          boxShadow: "var(--sh)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px -6px var(--ac)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#04130d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{t("title")}</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{t("sub")}</div>
          </div>
        </div>

        {success ? (
          <div>
            <div style={{ color: "var(--ac)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{t("success")}</div>
            <a
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 18px",
                borderRadius: 11,
                border: "1px solid var(--bd)",
                background: "var(--s2)",
                color: "var(--tx)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              {t("backToLogin")}
            </a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("email")}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
            </label>

            {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(150deg,var(--acb),var(--ac))",
                color: "#04130d",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: busy ? 0.7 : 1,
                marginBottom: 16,
              }}
            >
              {busy ? t("sending") : t("submit")}
            </button>

            <a
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
              {t("backToLogin")}
            </a>
          </form>
        )}
      </div>
    </div>
  );
}

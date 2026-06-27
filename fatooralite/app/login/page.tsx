"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";

const L = {
  title: { en: "Sign in to FatooraLite", ar: "تسجيل الدخول إلى فاتورة لايت" },
  sub: { en: "ZATCA Phase 2 compliance", ar: "الامتثال للمرحلة الثانية للهيئة" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  signin: { en: "Sign in", ar: "دخول" },
  signing: { en: "Signing in…", ar: "جارٍ الدخول…" },
  demo: { en: "Demo: khalid@almarai.example / owner1234", ar: "تجريبي: khalid@almarai.example / owner1234" },
};

export default function LoginPage() {
  const { lang } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const t = (k: keyof typeof L) => L[k][lang];

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
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{t("title")}</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{t("sub")}</div>
          </div>
        </div>

        <form onSubmit={submit}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("email")}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          </label>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("password")}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
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
            }}
          >
            {busy ? t("signing") : t("signin")}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--t3)", textAlign: "center" }}>
          {lang === "ar" ? "ليس لديك حساب؟ " : "Don't have an account? "}
          <a href="/register" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
            {lang === "ar" ? "أنشئ شركتك" : "Create your company"}
          </a>
        </div>
      </div>
    </div>
  );
}

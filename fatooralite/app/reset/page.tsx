"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";

const L = {
  title: { en: "Set new password", ar: "تعيين كلمة مرور جديدة" },
  sub: { en: "Enter a strong password (min 8 chars)", ar: "أدخل كلمة مرور قوية (٨ أحرف على الأقل)" },
  password: { en: "New Password", ar: "كلمة المرور الجديدة" },
  confirm: { en: "Confirm Password", ar: "تأكيد كلمة المرور" },
  submit: { en: "Update password", ar: "تحديث كلمة المرور" },
  updating: { en: "Updating…", ar: "جاري التحديث…" },
  success: { en: "Password updated successfully! Redirecting…", ar: "تم تحديث كلمة المرور بنجاح! جاري التوجيه…" },
  errorMismatch: { en: "Passwords do not match", ar: "كلمات المرور غير متطابقة" },
  errorNoToken: { en: "Missing or invalid token.", ar: "رابط إعادة التعيين مفقود أو غير صالح." },
};

function ResetForm() {
  const { lang, setLang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const t = (k: keyof typeof L) => L[k][lang];

  const tokenError = token ? "" : t("errorNoToken");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("errorMismatch"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
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
          <div
            style={{
              padding: "16px",
              borderRadius: 12,
              background: "var(--acs)",
              border: "1px solid var(--acbd)",
              color: "var(--ac)",
              fontSize: 14,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            ✓ {t("success")}
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                minLength={8}
                required
                disabled={!token}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>
                {t("confirm")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
                minLength={8}
                required
                disabled={!token}
              />
            </div>

            {(error || tokenError) && (
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
                ✕ {error || tokenError}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !token}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(150deg,var(--acb),var(--ac))",
                color: "var(--on-ac)",
                fontSize: 14,
                fontWeight: 700,
                cursor: busy || !token ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: busy || !token ? 0.7 : 1,
                boxShadow: "0 10px 25px -8px var(--ac)",
              }}
            >
              {busy ? t("updating") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

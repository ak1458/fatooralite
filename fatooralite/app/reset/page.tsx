"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";

const L = {
  title: { en: "Set new password", ar: "تعيين كلمة مرور جديدة" },
  sub: { en: "Enter a strong password (min 8 chars)", ar: "أدخل كلمة مرور قوية (٨ أحرف على الأقل)" },
  password: { en: "New Password", ar: "كلمة المرور الجديدة" },
  confirm: { en: "Confirm Password", ar: "تأكيد كلمة المرور" },
  submit: { en: "Update password", ar: "تحديث كلمة المرور" },
  updating: { en: "Updating…", ar: "جاري التحديث…" },
  success: { en: "Password updated successfully!", ar: "تم تحديث كلمة المرور بنجاح!" },
  errorMismatch: { en: "Passwords do not match", ar: "كلمات المرور غير متطابقة" },
  errorNoToken: { en: "Missing or invalid token.", ar: "رابط إعادة التعيين مفقود أو غير صالح." },
};

export default function ResetPage() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const t = (k: keyof typeof L) => L[k][lang];

  useEffect(() => {
    if (!token) {
      setError(t("errorNoToken"));
    }
  }, [token]);

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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{t("title")}</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{t("sub")}</div>
          </div>
        </div>

        {success ? (
          <div style={{ color: "var(--ac)", fontSize: 14, textAlign: "center", fontWeight: 600 }}>
            {t("success")}
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("password")}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                minLength={8}
                required
                disabled={!token}
              />
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("confirm")}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                minLength={8}
                required
                disabled={!token}
              />
            </label>

            {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              type="submit"
              disabled={busy || !token}
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
              {busy ? t("updating") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

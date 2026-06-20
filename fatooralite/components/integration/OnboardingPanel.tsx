"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

const L = {
  title: { en: "ZATCA Onboarding", ar: "التسجيل لدى الهيئة" },
  intro: {
    en: "Register this unit with ZATCA: generate a CSR, exchange your portal OTP for a Compliance CSID, then request the Production CSID.",
    ar: "سجّل هذه الوحدة لدى الهيئة: توليد طلب شهادة، استبدال رمز البوابة المؤقت بشهادة امتثال، ثم طلب شهادة الإنتاج.",
  },
  mode: { en: "Environment", ar: "البيئة" },
  otp: { en: "Portal OTP", ar: "رمز البوابة المؤقت" },
  cn: { en: "EGS / unit name (CN)", ar: "اسم الوحدة" },
  ou: { en: "Branch (OU)", ar: "الفرع" },
  step1: { en: "1 · Request Compliance CSID", ar: "١ · طلب شهادة الامتثال" },
  step2: { en: "2 · Request Production CSID", ar: "٢ · طلب شهادة الإنتاج" },
  working: { en: "Working…", ar: "جارٍ…" },
  done1: { en: "Compliance CSID issued", ar: "تم إصدار شهادة الامتثال" },
  done2: { en: "Production CSID active — ready to clear", ar: "شهادة الإنتاج نشطة — جاهز للإجازة" },
};

export function OnboardingPanel() {
  const { lang } = useLang();
  const t = (k: keyof typeof L) => L[k][lang];
  const [companyId, setCompanyId] = useState("");
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
  const [otp, setOtp] = useState("");
  const [cn, setCn] = useState("FatooraLite-EGS");
  const [ou, setOu] = useState("Riyadh HQ");
  const [busy, setBusy] = useState(false);
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanyId(d.companies?.[0]?.id ?? ""))
      .catch(() => {});
  }, []);

  async function call(path: string, body: object) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid var(--bd)",
    background: "var(--s2)",
    color: "var(--tx)",
    fontSize: 13.5,
    fontFamily: "inherit",
  };
  const btn = (primary: boolean): React.CSSProperties => ({
    padding: "10px 16px",
    borderRadius: 11,
    border: primary ? "none" : "1px solid var(--bd)",
    background: primary ? "linear-gradient(150deg,var(--acb),var(--ac))" : "var(--s1)",
    color: primary ? "#04130d" : "var(--t2)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    opacity: busy ? 0.7 : 1,
  });

  return (
    <Card style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "var(--acs)",
            color: "var(--ac)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="cert" size={20} sw={1.6} />
        </span>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{t("title")}</div>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--t2)", lineHeight: 1.5 }}>{t("intro")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("mode")}</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as "sandbox" | "production")} style={inputStyle}>
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </label>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("otp")}</span>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} style={inputStyle} placeholder="123456" />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("cn")}</span>
          <input value={cn} onChange={(e) => setCn(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{t("ou")}</span>
          <input value={ou} onChange={(e) => setOu(e.target.value)} style={inputStyle} />
        </label>
      </div>

      {error && <div style={{ marginTop: 12, color: "var(--dang)", fontSize: 13 }}>{error}</div>}
      {step1Done && !step2Done && (
        <div style={{ marginTop: 12, color: "var(--ac)", fontSize: 13, fontWeight: 600 }}>✓ {t("done1")}</div>
      )}
      {step2Done && (
        <div style={{ marginTop: 12, color: "var(--ac)", fontSize: 13, fontWeight: 600 }}>✓ {t("done2")}</div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button
          disabled={busy || !companyId}
          onClick={async () => {
            const ok = await call("/api/onboarding/start", {
              companyId,
              otp,
              commonName: cn,
              organizationalUnit: ou,
              mode,
            });
            if (ok) setStep1Done(true);
          }}
          style={btn(!step1Done)}
        >
          {busy ? t("working") : t("step1")}
        </button>
        <button
          disabled={busy || !step1Done}
          onClick={async () => {
            const ok = await call("/api/onboarding/complete", { companyId, mode });
            if (ok) setStep2Done(true);
          }}
          style={btn(step1Done && !step2Done)}
        >
          {busy ? t("working") : t("step2")}
        </button>
      </div>
    </Card>
  );
}

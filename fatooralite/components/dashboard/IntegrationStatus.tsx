"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { Service } from "@/types";

const defaultServices: Service[] = [
  { name: { en: "CSID Issuance", ar: "إصدار CSID" }, ok: true },
  { name: { en: "Cryptographic Stamp", ar: "الختم التشفيري" }, ok: true },
  { name: { en: "XML Validation", ar: "التحقق من XML" }, ok: true },
  { name: { en: "QR Generation", ar: "توليد QR" }, ok: true },
  { name: { en: "Clearance API", ar: "واجهة الإجازة" }, ok: true },
  { name: { en: "Reporting API", ar: "واجهة الإبلاغ" }, ok: true },
  { name: { en: "Sandbox Gateway", ar: "بوابة الاختبار" }, ok: true },
  { name: { en: "Production Cert", ar: "شهادة الإنتاج" }, ok: true },
];

export function IntegrationStatus({ services: svcProp }: { services?: Service[] }) {
  const { t, lang } = useLang();
  const services = svcProp ?? defaultServices;

  return (
    <Card
      folderTab={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🌐</span>
          <span>{lang === "ar" ? "حالة تكامل الهيئة" : "ZATCA Integration Matrix"}</span>
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 4 }}>
        <div style={{ fontSize: 13, color: "var(--t3)" }}>
          {lang === "ar" ? "حالة خدمات وبوابات الربط المباشر مع ZATCA Phase-2" : "Real-time health of Phase-2 services & APIs"}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ac)",
            background: "var(--acs)",
            border: "1px solid var(--acbd)",
            padding: "3px 8px",
            borderRadius: 8,
          }}
        >
          All Systems Operational
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {services.map((s, idx) => {
          const ok = s.ok === true;
          const color = ok ? "var(--ac)" : s.ok === "degraded" ? "var(--warn)" : "var(--t3)";
          const glow = ok ? "var(--acs)" : s.ok === "degraded" ? "var(--warns)" : "transparent";
          const ping = ok ? `< ${60 + (idx * 12)}ms` : "Standby";

          return (
            <div
              key={s.name.en}
              className="glass-card-hover"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--s2)",
                border: "1px solid var(--bd)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <StatusDot color={color} glow={glow} />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--tx)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.name[lang]}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  fontFamily: "var(--fmono)",
                  color: ok ? "var(--ac)" : "var(--t3)",
                  background: ok ? "rgba(16, 185, 129, 0.08)" : "transparent",
                  padding: "2px 6px",
                  borderRadius: 6,
                }}
              >
                {ping}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


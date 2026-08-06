"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import type { Service } from "@/types";

const defaultServices: Service[] = [
  { name: { en: "CSID Issuance", ar: "إصدار CSID" }, ok: false },
  { name: { en: "Cryptographic Stamp", ar: "الختم التشفيري" }, ok: false },
  { name: { en: "XML Validation", ar: "التحقق من XML" }, ok: false },
  { name: { en: "QR Generation", ar: "توليد QR" }, ok: false },
  { name: { en: "Clearance API", ar: "واجهة الإجازة" }, ok: false },
  { name: { en: "Reporting API", ar: "واجهة الإبلاغ" }, ok: false },
  { name: { en: "Sandbox Env", ar: "بيئة الاختبار" }, ok: false },
  { name: { en: "Production Env", ar: "بيئة الإنتاج" }, ok: false },
];

export function IntegrationStatus({ services: svcProp }: { services?: Service[] }) {
  const { t, lang } = useLang();
  const services = svcProp ?? defaultServices;
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
        {t.integrationStatus}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {services.map((s) => {
          const ok = s.ok === true;
          const color = ok ? "var(--ac)" : s.ok === "degraded" ? "var(--warn)" : "var(--t3)";
          const glow = ok ? "var(--acs)" : s.ok === "degraded" ? "var(--warns)" : "transparent";
          return (
            <div
              key={s.name.en}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 11px",
                borderRadius: 11,
                background: "var(--s2)",
              }}
            >
              <StatusDot color={color} glow={glow} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--t2)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.name[lang]}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


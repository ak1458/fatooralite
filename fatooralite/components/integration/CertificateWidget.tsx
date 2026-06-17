"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { certificate } from "@/data/company";

export function CertificateWidget() {
  const { t } = useLang();
  return (
    <Card style={{ padding: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "var(--acs)",
              color: "var(--ac)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cert" size={22} sw={1.6} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t.certTitle}</div>
            <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--fmono)" }}>
              SN · {certificate.serial}
            </div>
          </div>
        </div>
        <button
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--bd)",
            background: "var(--s2)",
            color: "var(--tx)",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {t.renew}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--t3)",
          marginBottom: 7,
        }}
      >
        <span>Issued {certificate.issued}</span>
        <span style={{ color: "var(--ac)", fontWeight: 600 }}>
          {certificate.daysLeft} {t.kDays}
        </span>
        <span>Expires {certificate.expires}</span>
      </div>
      <ProgressBar pct={certificate.pct} height={8} />
    </Card>
  );
}

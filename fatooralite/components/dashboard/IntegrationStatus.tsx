"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { services } from "@/data/services";

export function IntegrationStatus() {
  const { t, lang } = useLang();
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
        {t.integrationStatus}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {services.map((s) => {
          const ok = s.ok === true;
          const color = ok ? "var(--ac)" : "var(--warn)";
          const glow = ok ? "var(--acs)" : "var(--warns)";
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

"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { revenueByCustomer } from "@/data/analytics";

export function RevenueByCustomer() {
  const { t, lang } = useLang();
  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>{t.revTitle}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {revenueByCustomer.map((r) => (
          <div key={r.name.en}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--t2)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "70%",
                }}
              >
                {r.name[lang]}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "var(--fmono)" }}>
                {r.value}
              </span>
            </div>
            <div style={{ height: 7, borderRadius: 7, background: "var(--s3)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${r.pct}%`,
                  borderRadius: 7,
                  background: "linear-gradient(90deg,var(--ac),var(--acb))",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

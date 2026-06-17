"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { dailyBars } from "@/data/analytics";

export function DailyBars() {
  const { t } = useLang();
  const last = dailyBars.length - 1;
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.dailyTitle}</div>
        <span style={{ fontSize: 11.5, color: "var(--t3)" }}>{t.mtd}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 170 }}>
        {dailyBars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${h}%`,
                borderRadius: "6px 6px 3px 3px",
                background:
                  i === last ? "linear-gradient(180deg,var(--acb),var(--ac))" : "var(--s3)",
              }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { trustBadges } from "@/data/kpis";
import type { Dict } from "@/lib/i18n/dictionary";

export function TrustBadges() {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 20 }}>
      {trustBadges.map((b) => (
        <div
          key={b.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 13px",
            borderRadius: 10,
            background: "var(--s1)",
            border: "1px solid var(--bd)",
          }}
        >
          <span style={{ display: "flex", color: "var(--ac)" }}>
            <Icon name={b.icon} size={15} sw={1.9} />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t2)" }}>
            {t[b.key as keyof Dict]}
          </span>
        </div>
      ))}
    </div>
  );
}

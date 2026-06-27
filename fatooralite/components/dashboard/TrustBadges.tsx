"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import type { Dict } from "@/lib/i18n/dictionary";

export interface TrustBadge {
  key: string;
  icon: string;
  active: boolean;
}

const defaultBadges: TrustBadge[] = [
  { key: "trustReady", icon: "check", active: false },
  { key: "trustPhase2", icon: "compliance", active: false },
  { key: "trustProd", icon: "bolt", active: false },
  { key: "trustEnc", icon: "lock", active: false },
];

export function TrustBadges({ badges: badgeProp }: { badges?: TrustBadge[] }) {
  const { t } = useLang();
  const badges = badgeProp ?? defaultBadges;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 20 }}>
      {badges.map((b) => (
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
            opacity: b.active ? 1 : 0.5,
          }}
        >
          <span style={{ display: "flex", color: b.active ? "var(--ac)" : "var(--t3)" }}>
            <Icon name={b.icon} size={15} sw={1.9} />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: b.active ? "var(--t2)" : "var(--t3)" }}>
            {t[b.key as keyof Dict]}
          </span>
        </div>
      ))}
    </div>
  );
}


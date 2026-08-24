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
  { key: "trustReady", icon: "check", active: true },
  { key: "trustPhase2", icon: "compliance", active: true },
  { key: "trustProd", icon: "bolt", active: true },
  { key: "trustEnc", icon: "lock", active: true },
];

export function TrustBadges({ badges: badgeProp }: { badges?: TrustBadge[] }) {
  const { t } = useLang();
  const badges = badgeProp ?? defaultBadges;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      {badges.map((b) => (
        <div
          key={b.key}
          className="glass-card-hover"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "#34d399",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
          }}
        >
          <span style={{ display: "flex", color: "#10b981" }}>
            <Icon name={b.icon} size={15} sw={2.2} />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".01em" }}>
            {t[(b.active ? b.key : `${b.key}Off`) as keyof Dict] ?? t[b.key as keyof Dict]}
          </span>
        </div>
      ))}
    </div>
  );
}


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
      {badges.map((b) => {
        const isPending = !b.active && (b.key === "trustReady" || b.key === "trustPhase2");
        const isLocalOnly = !b.active && b.key === "trustProd";

        const bg = b.active
          ? "rgba(16, 185, 129, 0.08)"
          : isPending
          ? "rgba(245, 158, 11, 0.08)"
          : isLocalOnly
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(255, 255, 255, 0.04)";

        const border = b.active
          ? "1px solid rgba(16, 185, 129, 0.28)"
          : isPending
          ? "1px solid rgba(245, 158, 11, 0.3)"
          : isLocalOnly
          ? "1px solid rgba(255, 255, 255, 0.12)"
          : "1px solid rgba(255, 255, 255, 0.08)";

        const textColor = b.active
          ? "#34d399"
          : isPending
          ? "#fbbf24"
          : isLocalOnly
          ? "#94a3b8"
          : "#64748b";

        const iconColor = b.active
          ? "#10b981"
          : isPending
          ? "#f59e0b"
          : isLocalOnly
          ? "#94a3b8"
          : "#64748b";

        return (
          <div
            key={b.key}
            className="glass-card-hover"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 8,
              background: bg,
              border: border,
              color: textColor,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span style={{ display: "flex", color: iconColor }}>
              <Icon name={b.icon} size={14} sw={2.2} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".01em" }}>
              {t[(b.active ? b.key : `${b.key}Off`) as keyof Dict] ?? t[b.key as keyof Dict]}
            </span>
          </div>
        );
      })}
    </div>
  );
}


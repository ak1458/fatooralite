"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import type { NavGroupDef } from "@/types";
import { NavItem } from "./NavItem";

/** A labeled section of the sidebar (e.g. "Operations") and its links. */
export function NavGroup({ group }: { group: NavGroupDef }) {
  const { t } = useLang();
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: ".09em",
          textTransform: "uppercase",
          color: "var(--t3)",
          padding: "0 10px 7px",
        }}
      >
        {t[group.label]}
      </div>
      {group.items.map((item) => (
        <NavItem
          key={item.id}
          href={item.href}
          icon={item.icon}
          label={t[item.label]}
          badge={item.badge}
        />
      ))}
    </div>
  );
}

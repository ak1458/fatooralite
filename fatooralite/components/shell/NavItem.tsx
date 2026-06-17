"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/** One sidebar link. Active state derives from the current route. */
export function NavItem({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: string;
}) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      data-active={active}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "8px 11px",
        borderRadius: 11,
        fontSize: 13.5,
        fontWeight: 500,
        textDecoration: "none",
        marginBottom: 2,
        background: active ? "var(--acs)" : "transparent",
        color: active ? "var(--ac)" : "var(--t2)",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            insetInlineStart: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 17,
            borderRadius: "0 3px 3px 0",
            background: "var(--ac)",
          }}
        />
      )}
      <span style={{ display: "flex", flex: "none" }}>
        <Icon name={icon} size={18} />
      </span>
      <span
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      {badge && (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 9,
            background: "var(--ac)",
            color: "#04130d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--fdisp)",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

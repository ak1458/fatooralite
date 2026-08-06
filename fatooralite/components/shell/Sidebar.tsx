"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { navGroups } from "@/data/nav";
import { NavGroup } from "./NavGroup";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { TrustPill } from "./TrustPill";
import type { SidebarMode } from "@/lib/hooks/useSidebarState";

const BRAND = "Fatoora Lite Pro";

const WIDTH_FULL = 264;
const WIDTH_COLLAPSED = 64;

export function Sidebar({
  mode = "full",
  open = false,
  onClose,
}: {
  mode?: SidebarMode;
  open?: boolean;
  onClose?: () => void;
}) {
  const { t } = useLang();
  const collapsed = mode === "collapsed";
  const drawer = mode === "drawer";
  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_FULL;

  const sidebarContent = (
    <aside
      aria-label="Main navigation"
      style={{
        width: drawer ? WIDTH_FULL : width,
        flex: "none",
        borderInlineEnd: drawer ? "none" : "1px solid var(--bd)",
        background: "var(--s1)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: drawer ? "fixed" : "sticky",
        top: 0,
        insetInlineStart: 0,
        zIndex: drawer ? 40 : "auto",
        transform: drawer
          ? open
            ? "translateX(0)"
            : "translateX(calc(-100% - 1px))"
          : "none",
        transition: drawer ? "transform var(--dur-normal) var(--ease)" : "width var(--dur-normal) var(--ease)",
        overflowX: "hidden",
      }}
    >
      {/* brand */}
      <div
        style={{
          padding: collapsed ? "20px 14px 14px" : "20px 18px 14px",
          display: "flex",
          alignItems: "center",
          gap: 11,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: "linear-gradient(150deg,var(--acb),var(--ac))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 16px -6px var(--ac)",
            flex: "none",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--on-ac)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.1 }}>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                letterSpacing: "-.02em",
                fontFamily: "var(--fdisp)",
              }}
            >
              {BRAND}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--t3)",
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {t.brandTag}
            </div>
          </div>
        )}
        {/* Close button for drawer mode */}
        {drawer && open && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              marginInlineStart: "auto",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--bd)",
              background: "var(--s2)",
              color: "var(--t2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        )}
      </div>

      {!collapsed && <WorkspaceSwitcher />}

      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "4px 6px 12px" : "4px 12px 12px" }}>
        {navGroups.map((g) => (
          <NavGroup key={g.label} group={g} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && <TrustPill />}
    </aside>
  );

  if (drawer) {
    return (
      <>
        {/* Overlay */}
        <div
          className="sidebar-overlay"
          data-open={open}
          onClick={onClose}
          aria-hidden="true"
        />
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
}

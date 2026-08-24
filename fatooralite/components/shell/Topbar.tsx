"use client";
import Link from "next/link";
import { usePageMeta } from "@/lib/usePageMeta";
import { SearchButton } from "./SearchButton";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { NotificationBell } from "./NotificationBell";
import { Icon } from "@/components/ui/Icon";
import type { SidebarMode } from "@/lib/hooks/useSidebarState";

export function Topbar({
  sidebarMode,
  onMenuClick,
}: {
  sidebarMode?: SidebarMode;
  onMenuClick?: () => void;
}) {
  const { title, sub } = usePageMeta();
  const showMenu = sidebarMode === "drawer";

  return (
    <header
      style={{
        height: 68,
        flex: "none",
        borderBottom: "1px solid var(--bd)",
        background: "rgba(7, 9, 14, 0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: showMenu ? "0 16px" : "0 28px",
      }}
    >
      {/* Hamburger for mobile */}
      {showMenu && (
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "1px solid var(--bd)",
            background: "var(--s1)",
            color: "var(--t2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            fontFamily: "inherit",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Page Title & Context */}
      <div style={{ minWidth: 0, flex: "0 1 auto" }}>
        <div
          style={{
            fontSize: showMenu ? 15 : 17,
            fontWeight: 800,
            letterSpacing: "-.02em",
            fontFamily: "var(--fdisp)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "var(--tx)",
          }}
        >
          {title}
        </div>
        {!showMenu && sub && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--t3)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        )}
      </div>

      {/* Center Search Pill */}
      {!showMenu && (
        <div style={{ flex: "1 1 360px", maxWidth: 460, margin: "0 20px" }}>
          <SearchButton />
        </div>
      )}

      {/* Right Controls */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: showMenu ? 8 : 12 }}>
        {!showMenu && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 20,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: 12,
              fontWeight: 700,
              color: "#34d399",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span>ZATCA Phase-2</span>
          </div>
        )}
        {!showMenu && <LangToggle />}
        <ThemeToggle />
        <NotificationBell />
        {!showMenu && (
          <div style={{ width: 1, height: 24, background: "var(--bd)", margin: "0 2px" }} />
        )}
        <ProfileMenu />
      </div>
    </header>
  );
}

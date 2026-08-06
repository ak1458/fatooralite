"use client";
import { usePageMeta } from "@/lib/usePageMeta";
import { SearchButton } from "./SearchButton";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { NotificationBell } from "./NotificationBell";
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
        height: 64,
        flex: "none",
        borderBottom: "1px solid var(--bd)",
        background: "color-mix(in srgb, var(--bg) 72%, transparent)",
        backdropFilter: "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: showMenu ? 12 : 18,
        padding: showMenu ? "0 14px" : "0 22px",
      }}
    >
      {/* Hamburger for mobile drawer mode */}
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <div style={{ minWidth: 0, flex: showMenu ? 1 : "none", maxWidth: showMenu ? 160 : 280 }}>
        <div
          style={{
            fontSize: showMenu ? 14 : 15,
            fontWeight: 700,
            letterSpacing: "-.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {!showMenu && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--t3)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sub}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {!showMenu && <SearchButton />}
      </div>

      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: showMenu ? 6 : 9 }}>
        {!showMenu && <LangToggle />}
        <ThemeToggle />
        <NotificationBell />
        {!showMenu && (
          <div style={{ width: 1, height: 26, background: "var(--bd)", margin: "0 2px" }} />
        )}
        <ProfileMenu />
      </div>
    </header>
  );
}

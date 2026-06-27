"use client";
import { usePageMeta } from "@/lib/usePageMeta";
import { SearchButton } from "./SearchButton";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { NotificationBell } from "./NotificationBell";

export function Topbar() {
  const { title, sub } = usePageMeta();
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
        gap: 18,
        padding: "0 22px",
      }}
    >
      <div style={{ minWidth: 0, flex: "none", maxWidth: 280 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
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
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <SearchButton />
      </div>

      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 9 }}>
        <LangToggle />
        <ThemeToggle />
        <NotificationBell />
        <div style={{ width: 1, height: 26, background: "var(--bd)", margin: "0 2px" }} />
        <ProfileMenu />
      </div>
    </header>
  );
}

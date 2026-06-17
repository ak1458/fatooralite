"use client";
import { usePageMeta } from "@/lib/usePageMeta";
import { SearchButton } from "./SearchButton";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { Icon } from "@/components/ui/Icon";

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
        <button
          title="Notifications"
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 38,
            height: 38,
            borderRadius: 10,
            border: "1px solid var(--bd)",
            background: "var(--s1)",
            color: "var(--t2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="notifications" size={18} sw={1.8} />
          <span
            style={{
              position: "absolute",
              top: 8,
              insetInlineEnd: 9,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--dang)",
              border: "2px solid var(--s1)",
            }}
          />
        </button>
        <div style={{ width: 1, height: 26, background: "var(--bd)", margin: "0 2px" }} />
        <ProfileMenu />
      </div>
    </header>
  );
}

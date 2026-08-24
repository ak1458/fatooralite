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
        background: "color-mix(in srgb, var(--bg) 78%, transparent)",
        backdropFilter: "blur(18px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: showMenu ? 10 : 16,
        padding: showMenu ? "0 14px" : "0 24px",
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

      <div style={{ minWidth: 0, flex: showMenu ? 1 : "none", maxWidth: showMenu ? 160 : 260 }}>
        <div
          style={{
            fontSize: showMenu ? 14 : 16,
            fontWeight: 700,
            letterSpacing: "-.015em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "var(--tx)",
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
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        )}
      </div>

      {/* Middle Interactive AI & Workflow Prompt Capsules (Inspired by Reference 1 - Mytasky) */}
      {!showMenu && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, overflowX: "auto", padding: "0 10px" }}>
          <Link
            href="/invoices/new"
            className="action-capsule"
            style={{
              padding: "6px 10px",
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              color: "var(--on-ac)",
              border: "none",
              boxShadow: "0 4px 12px -4px var(--ac)",
              textDecoration: "none",
            }}
          >
            <Icon name="plus" size={14} sw={2.4} />
          </Link>
          <Link
            href="/ai"
            className="action-capsule"
            style={{ textDecoration: "none" }}
          >
            <span style={{ color: "var(--ac)" }}>⚡</span>
            <span>Invoice Bot</span>
            <span style={{ fontSize: 11, color: "var(--t3)", marginInlineStart: 2 }}>Generate Invoices</span>
            <span style={{ fontSize: 10, color: "var(--t3)" }}>›</span>
          </Link>
          <Link
            href="/analytics"
            className="action-capsule"
            style={{ textDecoration: "none" }}
          >
            <span style={{ color: "var(--info)" }}>📊</span>
            <span>DataAnalyzer</span>
            <span style={{ fontSize: 11, color: "var(--t3)", marginInlineStart: 2 }}>Sales & VAT</span>
            <span style={{ fontSize: 10, color: "var(--t3)" }}>›</span>
          </Link>
          <Link
            href="/audit"
            className="action-capsule"
            style={{ textDecoration: "none" }}
          >
            <span style={{ color: "var(--warn)" }}>🛡️</span>
            <span>Report AI</span>
            <span style={{ fontSize: 11, color: "var(--t3)", marginInlineStart: 2 }}>Compliance Audit</span>
            <span style={{ fontSize: 10, color: "var(--t3)" }}>›</span>
          </Link>
        </div>
      )}

      {/* Right Controls */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: showMenu ? 6 : 10 }}>
        {!showMenu && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: 20,
              background: "var(--acs)",
              border: "1px solid var(--acbd)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ac)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--acb)", boxShadow: "0 0 8px var(--acb)" }} />
            <span>ZATCA Phase-2</span>
          </div>
        )}
        {!showMenu && <SearchButton />}
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

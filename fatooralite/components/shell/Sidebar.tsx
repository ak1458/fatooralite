"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { navGroups } from "@/data/nav";
import { NavGroup } from "./NavGroup";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { TrustPill } from "./TrustPill";

const BRAND = "FatooraLite";

export function Sidebar() {
  const { t } = useLang();
  return (
    <aside
      style={{
        width: 264,
        flex: "none",
        borderInlineEnd: "1px solid var(--bd)",
        background: "var(--s1)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* brand */}
      <div
        style={{
          padding: "20px 18px 14px",
          display: "flex",
          alignItems: "center",
          gap: 11,
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
            stroke="#04130d"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
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
      </div>

      <WorkspaceSwitcher />

      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px" }}>
        {navGroups.map((g) => (
          <NavGroup key={g.label} group={g} />
        ))}
      </nav>

      <TrustPill />
    </aside>
  );
}

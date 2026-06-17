"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";

/** Avatar + name/role + chevron in the topbar. */
export function ProfileMenu() {
  const { t, lang } = useLang();
  const initial = lang === "ar" ? "خ" : "K";
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "4px 6px",
        borderRadius: 11,
        border: "1px solid transparent",
        background: "transparent",
        cursor: "pointer",
        color: "var(--tx)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "linear-gradient(150deg,#2dd4bf,var(--ac))",
          color: "#04130d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          fontFamily: "var(--fdisp)",
        }}
      >
        {initial}
      </div>
      <div style={{ lineHeight: 1.15, textAlign: "start" }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
          {t.profileName}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--t3)" }}>{t.profileRole}</div>
      </div>
      <Icon name="chevron" size={14} sw={2} />
    </button>
  );
}

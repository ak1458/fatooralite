"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";

/** The workspace/company selector button at the top of the sidebar. */
export function WorkspaceSwitcher() {
  const { t } = useLang();
  return (
    <button
      style={{
        margin: "6px 14px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 11px",
        borderRadius: 12,
        border: "1px solid var(--bd)",
        background: "var(--s2)",
        cursor: "pointer",
        color: "var(--tx)",
        textAlign: "start",
        width: "calc(100% - 28px)",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: "var(--acs)",
          color: "var(--ac)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          flex: "none",
          fontFamily: "var(--fdisp)",
        }}
      >
        R
      </div>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t.workspace}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--t3)",
            fontFamily: "var(--fmono)",
            marginTop: 1,
          }}
        >
          {t.workspaceSub}
        </div>
      </div>
      <Icon name="chevron" size={14} sw={2} />
    </button>
  );
}

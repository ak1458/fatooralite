"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";

export function ChatInput() {
  const { t } = useLang();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 8px 8px 16px",
        borderRadius: 14,
        border: "1px solid var(--bd)",
        background: "var(--s2)",
      }}
    >
      <span style={{ flex: 1, fontSize: 13.5, color: "var(--t3)" }}>{t.aiPlaceholder}</span>
      <button
        aria-label="Send"
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          border: "none",
          background: "linear-gradient(150deg,var(--acb),var(--ac))",
          color: "#04130d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Icon name="bolt" size={16} sw={2} />
      </button>
    </div>
  );
}

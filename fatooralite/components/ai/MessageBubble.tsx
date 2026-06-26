"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import type { AiMessage } from "@/types";

const sparkAvatar = (
  <span
    style={{
      width: 30,
      height: 30,
      borderRadius: 9,
      background: "linear-gradient(150deg,var(--acb),var(--ac))",
      color: "#04130d",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
    }}
  >
    <Icon name="ai" size={17} sw={1.8} />
  </span>
);

export function MessageBubble({ msg }: { msg: AiMessage }) {
  const { lang } = useLang();
  const text = typeof msg.text === "string" ? msg.text : msg.text[lang];

  if (msg.role === "user") {
    return (
      <div
        style={{
          alignSelf: "flex-end",
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: "16px 16px 4px 16px",
          background: "var(--acs)",
          border: "1px solid rgba(16,185,129,.22)",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--tx)",
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, maxWidth: "88%" }}>
      {sparkAvatar}
      <div>
        <div
          style={{
            padding: "13px 16px",
            borderRadius: "4px 16px 16px 16px",
            background: "var(--s2)",
            border: "1px solid var(--bd)",
            fontSize: 13.5,
            lineHeight: 1.7,
            color: "var(--tx)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

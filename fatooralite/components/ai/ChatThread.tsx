"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { aiMessages } from "@/data/ai";
import { MessageBubble } from "./MessageBubble";
import { PromptChips } from "./PromptChips";
import { ChatInput } from "./ChatInput";

export function ChatThread() {
  const { t } = useLang();
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid var(--bd)",
        background: "var(--s1)",
        boxShadow: "var(--sh)",
        display: "flex",
        flexDirection: "column",
        minHeight: 560,
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--bd)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              color: "#04130d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="ai" size={20} sw={1.7} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t.nAI}</div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ac)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ac)" }} />
              FatooraGPT · ZATCA-tuned
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 8,
            background: "var(--s2)",
            color: "var(--t2)",
            fontFamily: "var(--fmono)",
          }}
        >
          ctx · 1,429 invoices
        </span>
      </div>

      {/* messages */}
      <div
        style={{
          flex: 1,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          overflowY: "auto",
        }}
      >
        {aiMessages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
      </div>

      {/* composer */}
      <div style={{ padding: "14px 20px 18px" }}>
        <PromptChips />
        <ChatInput />
      </div>
    </div>
  );
}

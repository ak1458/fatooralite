"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";

import { useState } from "react";

export function ChatInput({ onSend, isLoading }: { onSend: (text: string) => void; isLoading?: boolean }) {
  const { t } = useLang();
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
  };

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
      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
        placeholder={t.aiPlaceholder as string}
        style={{ flex: 1, fontSize: 13.5, color: "var(--tx)", background: "transparent", border: "none", outline: "none" }} 
      />
      <button
        onClick={handleSend}
        disabled={isLoading || !input.trim()}
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

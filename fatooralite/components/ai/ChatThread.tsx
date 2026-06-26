"use client";
import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { MessageBubble } from "./MessageBubble";
import { PromptChips } from "./PromptChips";
import { ChatInput } from "./ChatInput";
import type { AiMessage } from "@/types";

export function ChatThread() {
  const { t } = useLang();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    const newMsg: AiMessage = { role: "user", text };
    const history = [...messages, newMsg];
    setMessages(history);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "Request failed." }]);
        return;
      }

      // Keep the "Typing…" indicator until the first real token arrives, then
      // open the assistant bubble and stream into it. Avoids a long empty bubble
      // while a free reasoning model thinks before emitting content.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let opened = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (!acc) continue;
        if (!opened) {
          opened = true;
          setMessages((prev) => [...prev, { role: "assistant", text: acc }]);
        } else {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", text: acc };
            return next;
          });
        }
      }

      if (!opened) {
        setMessages((prev) => [...prev, { role: "assistant", text: "No response received. Please try again." }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

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
        ref={scrollRef}
        style={{
          flex: 1,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          overflowY: "auto",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: "auto", color: "var(--t3)", fontSize: 13.5 }}>
            Ask me anything about ZATCA regulations...
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} msg={m} />)
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div style={{ display: "flex", gap: 12, maxWidth: "88%", opacity: 0.7 }}>
            <div style={{ padding: "13px 16px", borderRadius: "4px 16px 16px 16px", background: "var(--s2)", border: "1px solid var(--bd)", fontSize: 13.5 }}>
              Typing...
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{ padding: "14px 20px 18px" }}>
        {messages.length === 0 && <PromptChips onSelect={handleSend} />}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}

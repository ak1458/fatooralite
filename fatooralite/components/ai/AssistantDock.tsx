"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCompany } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

interface Msg { role: "user" | "assistant"; text: string }
interface ModelOpt { id: string; label: string }

export function AssistantDock() {
  const { company } = useCompany();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<ModelOpt[]>([]);
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((d) => { setModels(d.models ?? []); setModel(d.defaultModel ?? d.models?.[0]?.id ?? ""); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Hide the dock on the auth/onboarding routes.
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register") || pathname?.startsWith("/onboarding")) {
    return null;
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      // 1) Try to handle it as a command (agent).
      const agent = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, companyId: company?.id, model }),
      }).then((r) => r.json()).catch(() => ({ handled: false }));

      if (agent?.handled) {
        setMessages((m) => [...m, { role: "assistant", text: agent.message }]);
        if (agent.navigate) setTimeout(() => router.push(agent.navigate), 600);
        return;
      }

      // 2) Otherwise answer as a grounded chat (streaming).
      const history = [...messages, { role: "user" as const, text }];
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, companyId: company?.id, model }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setMessages((m) => [...m, { role: "assistant", text: d.error || "Request failed." }]);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      let opened = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (!acc) continue;
        if (!opened) { opened = true; setMessages((m) => [...m, { role: "assistant", text: acc }]); }
        else setMessages((m) => { const n = [...m]; n[n.length - 1] = { role: "assistant", text: acc }; return n; });
      }
      if (!opened) setMessages((m) => [...m, { role: "assistant", text: "No response. Try again." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Connection error." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="AI assistant"
        style={{
          position: "fixed", insetInlineEnd: 24, bottom: 24, zIndex: 90,
          width: 54, height: 54, borderRadius: "50%", border: "none",
          background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          boxShadow: "0 12px 30px -8px var(--ac)",
        }}
      >
        <Icon name={open ? "chevron" : "ai"} size={24} sw={1.8} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed", insetInlineEnd: 24, bottom: 90, zIndex: 90,
            width: "min(400px, calc(100vw - 48px))", height: "min(560px, calc(100vh - 140px))",
            background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 18,
            boxShadow: "var(--sh)", display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="ai" size={17} sw={1.8} />
              </span>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Fatoora AI</div>
            </div>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              style={{ fontSize: 11.5, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--bd)", background: "var(--s2)", color: "var(--t2)", maxWidth: 150, fontFamily: "inherit" }}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
                Ask about ZATCA, or type a command like<br /><b style={{ color: "var(--t2)" }}>“make a 7-day report”</b> or <b style={{ color: "var(--t2)" }}>“add customer ACME”</b>.
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%", padding: "10px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? "var(--acs)" : "var(--s2)",
                  border: "1px solid var(--bd)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
              ))
            )}
            {busy && <div style={{ alignSelf: "flex-start", color: "var(--t3)", fontSize: 12.5 }}>…</div>}
          </div>

          <div style={{ padding: 12, borderTop: "1px solid var(--bd)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              placeholder="Ask or command…"
              style={{ flex: 1, fontSize: 13, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--s2)", color: "var(--tx)", outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send"
              style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon name="bolt" size={16} sw={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

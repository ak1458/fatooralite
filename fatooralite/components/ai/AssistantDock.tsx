"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCompany } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

interface Msg { role: "user" | "assistant"; text: string }
interface ModelOpt { id: string; label: string }
interface PendingAction { name: string; arguments: string; summary: string; confirmToken: string | null }

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
  const [pending, setPending] = useState<PendingAction | null>(null);
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
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register") || pathname?.startsWith("/onboarding") || pathname?.startsWith("/forgot") || pathname?.startsWith("/reset")) {
    return null;
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = [...messages, { role: "user" as const, text }];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      // Unified agent: reads/acts via tools and answers ZATCA questions (RAG).
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, companyId: company?.id, model }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", text: data.message || data.error || "No response. Try again." }]);
      if (data.pendingAction) setPending(data.pendingAction);
      if (data.navigate) setTimeout(() => router.push(data.navigate), 600);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Connection error." }]);
    } finally {
      setBusy(false);
    }
  }

  async function resolvePending(confirmed: boolean) {
    if (!pending || busy) return;
    const action = pending;
    setPending(null);
    if (!confirmed) {
      setMessages((m) => [...m, { role: "assistant", text: "Okay, cancelled — nothing was changed." }]);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // A server-minted token if we have one; otherwise (no session —
          // local-demo mode) the legacy trusted-args shape the route still
          // accepts for that case only.
          confirmedAction: action.confirmToken
            ? { token: action.confirmToken }
            : { name: action.name, arguments: action.arguments },
          companyId: company?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", text: data.message || data.error || "Action failed." }]);
      if (data.navigate) setTimeout(() => router.push(data.navigate), 600);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Connection error." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label="AI assistant"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed", right: 28, bottom: 28, zIndex: 90,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          boxShadow: "0 10px 25px -6px var(--ac)",
        }}
      >
        <Icon name={open ? "chevron" : "ai"} size={22} sw={2} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed", right: 28, bottom: 90, zIndex: 90,
              width: "min(420px, calc(100vw - 48px))", height: "min(580px, calc(100vh - 140px))",
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%), var(--s1)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--bd)", borderRadius: 22,
              boxShadow: "0 24px 50px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bd)", background: "var(--s2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px -2px var(--ac)" }}>
                  <Icon name="ai" size={18} sw={2} />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--tx)" }}>Fatoora AI</div>
                  <div style={{ fontSize: 10.5, color: "var(--ac)", fontWeight: 600 }}>ZATCA RAG Copilot</div>
                </div>
              </div>
              {/* Providers that pick their model by env return no list — an
                  empty picker is worse than none, so it is not rendered. */}
              {models.length > 0 && (
                <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Assistant model"
                  style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--s1)", color: "var(--t2)", maxWidth: 150, fontFamily: "inherit" }}>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              )}
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--t3)", fontSize: 13, padding: "20px 10px" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
                  Ask about ZATCA compliance, or type a command like<br /><b style={{ color: "var(--tx)" }}>“make a 7-day report”</b> or <b style={{ color: "var(--tx)" }}>“check CSID status”</b>.
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%", padding: "11px 15px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.role === "user" ? "linear-gradient(135deg, var(--acb), var(--ac))" : "var(--s2)",
                    color: m.role === "user" ? "var(--on-ac)" : "var(--tx)",
                    border: m.role === "user" ? "none" : "1px solid var(--bd)",
                    boxShadow: m.role === "user" ? "0 4px 14px -4px var(--ac)" : "none",
                    fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {m.text}
                  </div>
                ))
              )}
              {pending && (
                <div style={{
                  alignSelf: "stretch", padding: "12px 14px", borderRadius: 12,
                  background: "var(--acs)", border: "1px solid var(--ac)",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ac)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="lock" size={13} sw={2} /> Confirm action
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{pending.summary}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => resolvePending(true)} disabled={busy}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      Confirm
                    </button>
                    <button onClick={() => resolvePending(false)} disabled={busy}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1px solid var(--bd)", background: "var(--s2)", color: "var(--t2)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      Cancel
                    </button>
                  </div>
                </div>
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
                style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name="bolt" size={16} sw={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


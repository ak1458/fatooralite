"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

interface Note { id: string; title: string; message: string; type: string; read: boolean; createdAt: string }

export function NotificationBell() {
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!company?.id) return;
    fetch(`/api/notifications?companyId=${company.id}`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notifications ?? []))
      .catch(() => {});
  }, [company?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = notes.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, read: true }) });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function scan() {
    if (!company?.id) return;
    await fetch(`/api/notifications?companyId=${company.id}`, { method: "POST" });
    load();
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        title="Notifications" aria-label="Notifications"
        style={{ position: "relative", width: 38, height: 38, borderRadius: 10, border: "1px solid var(--bd)", background: open ? "var(--s2)" : "var(--s1)", color: "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Icon name="notifications" size={18} sw={1.8} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, insetInlineEnd: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--dang)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", insetInlineEnd: 0, top: "calc(100% + 8px)", width: 340, maxHeight: 420, overflowY: "auto", background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14, boxShadow: "var(--sh)", zIndex: 50 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--bd)" }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Notifications</span>
            <button onClick={scan} style={{ background: "transparent", border: "none", color: "var(--ac)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Check now</button>
          </div>
          {notes.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>You&apos;re all caught up.</div>
          ) : (
            notes.slice(0, 12).map((n) => (
              <button key={n.id} onClick={() => !n.read && markRead(n.id)}
                style={{ display: "block", width: "100%", textAlign: "start", padding: "11px 14px", borderBottom: "1px solid var(--bd)", background: n.read ? "transparent" : "var(--acs)", border: "none", cursor: n.read ? "default" : "pointer", fontFamily: "inherit" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!n.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--dang)", flex: "none" }} />}
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--tx)" }}>{n.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 3, lineHeight: 1.5 }}>{n.message}</div>
              </button>
            ))
          )}
          <Link href="/notifications" onClick={() => setOpen(false)} style={{ display: "block", textAlign: "center", padding: "11px", fontSize: 13, fontWeight: 600, color: "var(--ac)", textDecoration: "none" }}>
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { usePageMeta } from "@/lib/usePageMeta";
import { useCompany } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";
import type { Notification } from "@prisma/client";

export default function Page() {
  const { title } = usePageMeta();
  const { company } = useCompany();
  const companyId = company?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(() => {
    if (!companyId) return Promise.resolve();
    return fetch(`/api/notifications?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
      });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [companyId, load]);

  const scan = async () => {
    if (!companyId) return;
    setScanning(true);
    try {
      await fetch(`/api/notifications?companyId=${companyId}`, { method: "POST" });
      await load();
    } finally {
      setScanning(false);
    }
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>{title as string}</h1>
        <button
          onClick={scan}
          disabled={scanning || !companyId}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            background: "var(--ac)",
            color: "#000",
            fontWeight: 600,
            border: "none",
            cursor: scanning ? "wait" : "pointer",
            opacity: scanning ? 0.6 : 1,
          }}
        >
          {scanning ? "Scanning…" : "Check for new alerts"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notifications.length === 0 ? (
          <div style={{ color: "var(--t3)" }}>No notifications.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--s1)",
                border: "1px solid var(--bd)",
                opacity: n.read ? 0.6 : 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: "var(--t2)" }}>{n.message}</div>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--ac)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Mark as read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

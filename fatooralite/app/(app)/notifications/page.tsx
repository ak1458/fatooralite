"use client";
import { useState } from "react";
import { usePageMeta } from "@/lib/usePageMeta";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import type { Notification } from "@prisma/client";

export default function Page() {
  const { title } = usePageMeta();
  const { company } = useCompany();
  const companyId = company?.id;
  const [scanning, setScanning] = useState(false);
  const [localUpdates, setLocalUpdates] = useState<Record<string, boolean>>({});

  const { state, retry } = useAsyncData<{ notifications: Notification[] }>(
    async (signal) => {
      const res = await fetch(`/api/notifications?companyId=${companyId}`, { signal });
      if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
      return (await res.json()) as { notifications: Notification[] };
    },
    [companyId],
    { enabled: !!companyId },
  );

  const scan = async () => {
    if (!companyId) return;
    setScanning(true);
    try {
      await fetch(`/api/notifications?companyId=${companyId}`, { method: "POST" });
      retry();
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
    setLocalUpdates((prev) => ({ ...prev, [id]: true }));
  };

  if (!company) return <NoCompanyState />;

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
            color: "#04130d",
            fontWeight: 600,
            border: "none",
            cursor: scanning ? "wait" : "pointer",
            opacity: scanning ? 0.6 : 1,
          }}
        >
          {scanning ? "Scanning…" : "Check for new alerts"}
        </button>
      </div>
      <AsyncBoundary
        state={state}
        isEmpty={(d) => !d.notifications?.length}
        empty={<div style={{ color: "var(--t3)", padding: 20 }}>No notifications.</div>}
        onRetry={retry}
      >
        {(data) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.notifications.map((n) => {
              const isRead = localUpdates[n.id] ?? n.read;
              return (
                <div
                  key={n.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "var(--s1)",
                    border: "1px solid var(--bd)",
                    opacity: isRead ? 0.6 : 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: "var(--t2)" }}>{n.message}</div>
                  </div>
                  {!isRead && (
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
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { installApiInterceptor, type ApiRefusal } from "@/lib/api/intercept";

/**
 * Surfaces the two API refusals the app could previously not report:
 *
 * - **401** — the session expired mid-use. Until now every caller swallowed
 *   this in a `.catch(() => {})` and the page simply stopped updating, which
 *   reads as the app being broken rather than as "please sign in again".
 * - **402** — a plan limit or a Pro-only feature. The server sends a full
 *   explanation and an upgrade URL (lib/billing/deny.ts); nothing read it.
 *
 * Renders nothing until something is refused.
 */
export function ApiRefusalWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [refusal, setRefusal] = useState<ApiRefusal | null>(null);

  useEffect(() => {
    return installApiInterceptor(setRefusal);
  }, []);

  useEffect(() => {
    if (refusal?.status !== 401) return;
    // Send them to log in and bring them back where they were. Replace, not
    // push, so Back does not bounce off the expired page again.
    const next = encodeURIComponent(pathname || "/dashboard");
    router.replace(`/login?next=${next}&expired=1`);
  }, [refusal, pathname, router]);

  if (!refusal || refusal.status !== 402) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 60,
        maxWidth: 520,
        width: "calc(100% - 32px)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 16px",
        borderRadius: 12,
        border: "1px solid var(--ac)",
        background: "var(--s1)",
        boxShadow: "var(--sh)",
      }}
    >
      <div style={{ flex: 1, fontSize: 13, color: "var(--tx)" }}>
        {refusal.message ?? "That action needs a Pro plan."}
      </div>
      <a
        href={refusal.upgradeUrl ?? "/settings?tab=billing"}
        style={{
          padding: "7px 14px",
          borderRadius: 9,
          background: "linear-gradient(150deg,var(--acb),var(--ac))",
          color: "var(--on-ac)",
          fontSize: 12.5,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Upgrade
      </a>
      <button
        type="button"
        onClick={() => setRefusal(null)}
        aria-label="Dismiss"
        style={{
          border: "none",
          background: "transparent",
          color: "var(--t3)",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
          fontFamily: "inherit",
        }}
      >
        ×
      </button>
    </div>
  );
}

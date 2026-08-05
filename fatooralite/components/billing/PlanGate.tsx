"use client";

import Link from "next/link";
import { usePlan } from "@/lib/useCompany";

/**
 * Wraps an action that a plan limit can block.
 *
 * The server already refuses with a 402 carrying a full explanation, and
 * ApiRefusalWatcher surfaces that — but only *after* the click. A user who has
 * hit their trial cap should be able to see why the button is inert without
 * pressing it and reading a toast.
 *
 * The children render prop receives `disabled` so the caller keeps ownership of
 * its own button styling; this component only decides and explains.
 *
 * Deliberately fails open: while the plan is still loading, or if the read
 * failed, `usePlan().check` reports allowed. Disabling a legitimate action
 * because a fetch did not land is worse than letting the server say no.
 */
export function PlanGate({
  limit,
  children,
}: {
  limit: "invoices" | "branches" | "seats";
  children: (state: { disabled: boolean; reason: string | null }) => React.ReactNode;
}) {
  const { check } = usePlan();
  const { allowed, reason } = check(limit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      {children({ disabled: !allowed, reason })}
      {reason && (
        <div style={{ fontSize: 11.5, color: "var(--t3)", maxWidth: 340, lineHeight: 1.5 }}>
          {reason}{" "}
          <Link href="/settings?tab=billing" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}

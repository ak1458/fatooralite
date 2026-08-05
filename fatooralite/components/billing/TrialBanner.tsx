"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompany } from "@/lib/useCompany";

interface PlanStatus {
  plan: "trial" | "pro" | "expired";
  trialDaysLeft: number | null;
  invoiceUsage: { used: number; limit: number | null };
}

const DISMISS_KEY = "fl.trialBanner.dismissedOn";

/** Local date key, so a dismissal lasts for the day rather than forever. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Trial status strip above the page content.
 *
 * Deliberately not a modal and not a blocker: the brief asked the interface to
 * communicate the value of Pro "without being intrusive". It escalates instead
 * — muted for most of the trial, warmer in the last three days, and
 * non-dismissible only once the trial has actually ended, at which point it is
 * reporting a real change in what the app will do rather than advertising.
 */
export function TrialBanner() {
  const { company } = useCompany();
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [dismissedOn, setDismissedOn] = useState<string | null>(null);

  // The stored dismissal is read in the fetch callback rather than its own
  // effect: reading localStorage during render would desync hydration, and a
  // synchronous setState in an effect body causes a cascading re-render.
  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    fetch(`/api/companies/${company.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setDismissedOn(window.localStorage.getItem(DISMISS_KEY));
        setStatus({ plan: d.plan, trialDaysLeft: d.trialDaysLeft, invoiceUsage: d.invoiceUsage });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  if (!status || status.plan === "pro") return null;

  const expired = status.plan === "expired";
  const daysLeft = status.trialDaysLeft ?? 0;
  const urgent = expired || daysLeft <= 3;

  // An expired trial is a state change, not a promotion — it stays put.
  const dismissible = !urgent;
  if (dismissible && dismissedOn === today()) return null;

  const { used, limit } = status.invoiceUsage;
  const usageNote = limit === null ? null : `${used} of ${limit} invoices used this month`;

  const headline = expired
    ? "Your trial has ended"
    : daysLeft === 1
      ? "Last day of your trial"
      : `${daysLeft} days left in your trial`;

  const detail = expired
    ? "Your invoices and records stay available to view and export. Upgrade to Pro to issue new ones."
    : usageNote
      ? `${usageNote}. Pro removes the cap and unlocks multiple branches, unlimited team members, AI actions and API access.`
      : "Pro removes the invoice cap and unlocks multiple branches, unlimited team members, AI actions and API access.";

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        padding: "11px 16px",
        marginBottom: 18,
        borderRadius: 12,
        border: `1px solid ${urgent ? "var(--ac)" : "var(--bd)"}`,
        background: urgent ? "var(--acs)" : "var(--s1)",
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: urgent ? "var(--ac)" : "var(--tx)" }}>{headline}</div>
        <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 2 }}>{detail}</div>
      </div>

      <Link
        href="/settings?tab=billing"
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          background: "linear-gradient(150deg,var(--acb),var(--ac))",
          color: "var(--on-ac)",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Upgrade to Pro
      </Link>

      {dismissible && (
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, today());
            setDismissedOn(today());
          }}
          aria-label="Dismiss trial notice for today"
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
      )}
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Refund & Cancellation Policy — Fatoora Lite Pro",
  description: "Subscription refund and cancellation policy for Fatoora Lite Pro.",
};

export default function RefundPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <div style={{ background: "var(--warn)", color: "var(--on-warn)", fontWeight: 700, fontSize: 14, padding: "14px 18px", borderRadius: 12, margin: "20px 0" }}>
        DRAFT — not reviewed by counsel. Self-serve paid checkout is intentionally OFF (D3,
        docs/audit/decision-register.md) — the mechanics below are drafted ahead of that going live, but the
        specific refund window is deliberately left unset rather than invented; do not publish a number here
        without an approved commercial policy behind it.
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Refund & Subscription Cancellation Policy</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>1. Free Tier & Subscription Plans</h2>
          <p>Fatoora Lite Pro provides a free tier for initial testing and onboarding. Paid subscription tiers, when available, are expected to unlock extended monthly invoice volume limits and multi-branch features.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>2. Cancellation Policy</h2>
          <p>Once self-serve paid checkout is enabled, a paid subscription will be cancellable from your account settings, taking effect at the end of the current billing period — you keep Pro access through the period you already paid for, and the account then reverts to the free/expired state described in the Terms of Service rather than being deleted. Your invoice, customer, and compliance records are never deleted on cancellation; see the Data Retention Policy. The exact self-serve cancellation flow depends on which payment processor is integrated and is described precisely once that integration ships.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>3. Refund Eligibility</h2>
          <p>Refund eligibility and any refund window will be defined once a payment processor and final pricing are approved (see D3, docs/audit/decision-register.md) — deliberately not stated here as a specific day count or percentage ahead of that, so this page never publishes a commitment the business has not actually approved. Until self-serve checkout exists, no payment has been taken through the platform and this section does not yet apply.</p>
        </section>
      </div>
    </div>
  );
}

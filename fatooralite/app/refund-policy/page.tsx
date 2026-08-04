import Link from "next/link";

export const metadata = {
  title: "Refund & Cancellation Policy — Fatoora Lite Pro",
  description: "Subscription refund and cancellation policy for Fatoora Lite Pro.",
};

export default function RefundPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <div style={{ background: "var(--warn, #f59e0b)", color: "#1a1200", fontWeight: 700, fontSize: 14, padding: "14px 18px", borderRadius: 12, margin: "20px 0" }}>
        DRAFT — placeholder text, not reviewed by counsel, and describes no paid
        plan that exists yet (no payment processor is integrated as of this
        writing). Replace with real terms before any paid plan launches.
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
          <p>[Placeholder: describe how a customer cancels a paid subscription, and what happens to their data/access afterward — this depends on the payment processor chosen and is not yet finalized.]</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>3. Refund Eligibility</h2>
          <p>[Placeholder: define the actual refund window and eligibility once a payment processor and pricing model are chosen. Do not publish a specific commitment (e.g. a day count) until it is a real, approved policy — customers can hold the business to whatever is published here.]</p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Cancellation Policy — Fatoora Lite Pro",
  description: "How to cancel a Fatoora Lite Pro subscription.",
};

export default function CancellationPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <div style={{ background: "var(--warn, #f59e0b)", color: "#1a1200", fontWeight: 700, fontSize: 14, padding: "14px 18px", borderRadius: 12, margin: "20px 0" }}>
        DRAFT — no paid plan exists yet (no payment processor is integrated as
        of this writing). Placeholder text, not reviewed by counsel.
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Cancellation Policy</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>1. Free tier</h2>
          <p>The free tier has no subscription to cancel. You may stop using the service and, per the Privacy Policy, request deletion of your account and data at any time.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>2. Paid plans</h2>
          <p>[Placeholder: once a payment processor is chosen, describe exactly how a customer cancels a paid plan — self-serve in Settings, or by contacting support — and what happens to invoice data, ZATCA certificates, and access at the end of the billing period. See also the Refund Policy.]</p>
        </section>
      </div>
    </div>
  );
}

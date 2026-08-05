import Link from "next/link";

export const metadata = {
  title: "Acceptable Use Policy — Fatoora Lite Pro",
  description: "Rules for acceptable use of the Fatoora Lite Pro platform.",
};

export default function AcceptableUsePage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <div style={{ background: "var(--warn)", color: "var(--on-warn)", fontWeight: 700, fontSize: 14, padding: "14px 18px", borderRadius: 12, margin: "20px 0" }}>
        DRAFT — placeholder text, not reviewed by counsel. Replace before accepting real customers.
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Acceptable Use Policy</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>1. Permitted use</h2>
          <p>Fatoora Lite Pro is provided for issuing and managing ZATCA-compliant e-invoices for your own business. You are responsible for the accuracy of every invoice, customer, and product record you create.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>2. Prohibited use</h2>
          <p>You may not: submit fraudulent or intentionally inaccurate invoices to ZATCA; attempt to bypass, probe, or overload the platform&apos;s authentication, rate limiting, or ZATCA integration; access or attempt to access another tenant&apos;s data; use the platform to store or transmit unlawful content; or reverse-engineer the service beyond what applicable law permits.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>3. Enforcement</h2>
          <p>[Placeholder: describe consequences of a violation — warning, suspension, termination — and how a decision can be appealed. Requires legal/business sign-off before publication.]</p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Legal & Compliance Disclaimer — Fatoora Lite Pro",
  description: "ZATCA Phase-2 compliance and financial disclaimer for Fatoora Lite Pro.",
};

export default function DisclaimerPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Legal & ZATCA Compliance Disclaimer</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>1. ZATCA E-Invoicing Phase-2 Compliance</h2>
          <p>Fatoora Lite Pro provides cryptographic signing, QR code generation, and clearance/reporting APIs adhering to the ZATCA Phase-2 XML specifications. Users remain legally responsible for ensuring that all business details, VAT rates, and customer identification data entered into invoices are accurate and comply with Saudi Arabian tax regulations.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>2. Financial & Tax Advisory Disclaimer</h2>
          <p>Fatoora Lite Pro software does not provide formal legal, accounting, tax, or financial advice. Businesses should consult certified tax advisors or legal counsel registered in Saudi Arabia for official VAT tax advice.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>3. Production Certificate Responsibility</h2>
          <p>Cryptographic CSIDs (Cryptographic Stamp Identifier certificates) issued through the ZATCA portal represent legal authorization for your business entity. Users are solely responsible for securing their private key certificates generated during onboarding.</p>
        </section>
      </div>
    </div>
  );
}

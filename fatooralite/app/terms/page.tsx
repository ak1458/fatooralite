const bannerStyle: React.CSSProperties = {
  background: "var(--warn)",
  color: "var(--on-warn)",
  fontWeight: 700,
  fontSize: 14,
  padding: "14px 18px",
  borderRadius: 12,
  marginBottom: 28,
  lineHeight: 1.5,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "var(--fdisp)",
  marginTop: 26,
  marginBottom: 8,
};

const paragraphStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--t3)",
  lineHeight: 1.7,
  marginBottom: 4,
};

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          borderRadius: 20,
          padding: 32,
          border: "1px solid var(--bd)",
          background: "var(--s1)",
          boxShadow: "var(--sh)",
        }}
      >
        <div style={bannerStyle}>
          DRAFT — drafted from the product&apos;s actual functionality and data practices, but not reviewed
          by qualified legal counsel. Do not rely on this to accept real customers until reviewed.
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)", marginBottom: 6 }}>
          Terms of Service
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>Fatoora Lite Pro</div>

        <h2 style={sectionTitleStyle}>1. Acceptance of Terms</h2>
        <p style={paragraphStyle}>
          By creating an account, completing the onboarding wizard, or otherwise accessing Fatoora Lite Pro,
          you agree to these Terms of Service and to the Privacy Policy, Acceptable Use Policy, Data
          Retention Policy, and (once applicable) the Refund &amp; Cancellation Policy. If you are accepting
          these terms on behalf of a business, you confirm you have authority to bind that business, and
          &quot;you&quot; refers to that business throughout. If you do not agree, do not use the service.
        </p>

        <h2 style={sectionTitleStyle}>2. Service Description</h2>
        <p style={paragraphStyle}>
          Fatoora Lite Pro is a multi-tenant SaaS platform for creating, VAT-calculating, cryptographically
          signing, and submitting Saudi ZATCA Phase-2 e-invoices, and for managing the customers, products,
          and compliance records that support that. The service issues invoices, computes VAT per Saudi
          e-invoicing rules, generates the required cryptographic signature and QR code, and transmits
          invoices to ZATCA&apos;s gateway (sandbox or production, depending on your account&apos;s
          onboarding state). <strong>You remain responsible for the accuracy of every invoice, customer, and
          product record you enter</strong> — the service computes and formats what you input; it is not a
          substitute for your own bookkeeping or tax advice, and ZATCA production certification is a
          prerequisite outside the service&apos;s control for a live regulatory-grade submission. The service
          is provided on an as-available basis; planned maintenance and third-party outages (including
          ZATCA&apos;s own gateway) can affect availability.
        </p>

        <h2 style={sectionTitleStyle}>3. Data &amp; Privacy (Saudi PDPL)</h2>
        <p style={paragraphStyle}>
          Your business&apos;s account data, invoice and customer records, and the personal data of anyone
          named on an invoice are processed as described in the Privacy Policy, consistent with the Saudi
          Personal Data Protection Law (PDPL). Invoice data is additionally transmitted to ZATCA as required
          by Saudi e-invoicing regulation — that transmission is a legal obligation, not a discretionary
          sharing decision, and is not something your account settings can disable for a standard or
          simplified tax invoice. Application data is hosted on infrastructure located as described in the
          Privacy Policy; see that policy for the full data-processing detail, including retention (Data
          Retention Policy) and your rights as a data subject.
        </p>

        <h2 style={sectionTitleStyle}>4. Limitation of Liability</h2>
        <p style={paragraphStyle}>
          The service is provided &quot;as is&quot; without warranty of any kind, express or implied,
          including fitness for a particular purpose. Fatoora Lite Pro computes VAT and formats invoices
          according to its understanding of ZATCA&apos;s published requirements at the time of writing, but
          is not a substitute for advice from a qualified Saudi tax adviser, and does not warrant that any
          specific invoice or VAT figure will be accepted by ZATCA or satisfies your business&apos;s legal
          filing obligations. To the maximum extent permitted by Saudi law, Fatoora Lite Pro&apos;s aggregate
          liability for any claim arising from use of the service is limited to the fees you paid for the
          service in the three months preceding the claim, and Fatoora Lite Pro is not liable for indirect,
          incidental, or consequential damages. Nothing in this section limits liability that cannot be
          limited under applicable Saudi law. <strong>This entire section requires review by qualified legal
          counsel before it is relied upon.</strong>
        </p>

        <div style={{ marginTop: 28, fontSize: 12, color: "var(--t3)" }}>
          <a href="/privacy" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}

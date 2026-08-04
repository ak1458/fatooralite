const bannerStyle: React.CSSProperties = {
  background: "var(--warn, #f59e0b)",
  color: "#1a1200",
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
          DRAFT — placeholder text, not reviewed by counsel. Replace before accepting real customers.
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)", marginBottom: 6 }}>
          Terms of Service
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>Fatoora Lite Pro</div>

        <h2 style={sectionTitleStyle}>1. Acceptance of Terms</h2>
        <p style={paragraphStyle}>
          [Placeholder: describe how using the service, creating an account, or clicking &quot;I agree&quot;
          constitutes acceptance of these Terms of Service.]
        </p>

        <h2 style={sectionTitleStyle}>2. Service Description</h2>
        <p style={paragraphStyle}>
          [Placeholder: describe the invoicing, e-invoicing, and ZATCA compliance services provided by
          Fatoora Lite Pro, including any limitations or disclaimers about the scope of the service.]
        </p>

        <h2 style={sectionTitleStyle}>3. Data &amp; Privacy (Saudi PDPL)</h2>
        <p style={paragraphStyle}>
          [Placeholder: describe how customer and invoice data is processed under the Saudi Personal Data
          Protection Law (PDPL), including data residency, retention, and sharing with ZATCA. See also the
          Privacy Policy.]
        </p>

        <h2 style={sectionTitleStyle}>4. Limitation of Liability</h2>
        <p style={paragraphStyle}>
          [Placeholder: describe limitation of liability, warranty disclaimers, and indemnification terms.
          This section must be reviewed by qualified legal counsel before publication.]
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

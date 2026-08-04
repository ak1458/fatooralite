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

export default function PrivacyPage() {
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
          Privacy Policy
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>Fatoora Lite Pro</div>

        <h2 style={sectionTitleStyle}>What we collect</h2>
        <p style={paragraphStyle}>
          [Placeholder: list the categories of personal and business data collected, e.g. account holder
          name and email, company VAT/CR details, invoice and customer records, and usage/log data.]
        </p>

        <h2 style={sectionTitleStyle}>How we use it</h2>
        <p style={paragraphStyle}>
          [Placeholder: describe how collected data is used — providing the invoicing service, submitting
          e-invoices to ZATCA, account security, and product improvement — and any third parties involved.]
        </p>

        <h2 style={sectionTitleStyle}>Your rights under PDPL</h2>
        <p style={paragraphStyle}>
          [Placeholder: describe data subject rights under the Saudi Personal Data Protection Law (PDPL),
          including access, correction, deletion, and how to submit a request.]
        </p>

        <h2 style={sectionTitleStyle}>Contact</h2>
        <p style={paragraphStyle}>
          [Placeholder: provide a contact email or address for privacy-related inquiries and data subject
          requests.]
        </p>

        <div style={{ marginTop: 28, fontSize: 12, color: "var(--t3)" }}>
          <a href="/terms" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}

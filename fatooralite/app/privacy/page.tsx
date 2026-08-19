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
          DRAFT — drafted from the product&apos;s actual data model and processing, but not reviewed by
          qualified legal counsel. Do not rely on this to accept real customers until reviewed.
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)", marginBottom: 6 }}>
          Privacy Policy
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>Fatoora Lite Pro</div>

        <h2 style={sectionTitleStyle}>What we collect</h2>
        <p style={paragraphStyle}>
          Account data: your name, email, and password (stored as a salted hash, never in plain text).
          Business data: your company name, VAT registration number, commercial registration number,
          national address, and ZATCA onboarding/certificate details. Transaction data: the invoices,
          credit/debit notes, customers, and products you create — including, where you enter them, a
          customer&apos;s name, VAT number, address, phone, and email. Security/administrative data: sign-in
          history, IP address, and a record of security-relevant actions (logins, permission changes,
          certificate issuance) kept for audit purposes. If you use the optional AI assistant, your queries
          and the data it retrieves on your behalf are processed to generate a response; see &quot;How we use
          it&quot; below for the model-provider detail.
        </p>

        <h2 style={sectionTitleStyle}>How we use it</h2>
        <p style={paragraphStyle}>
          To provide the service: creating, VAT-calculating, and cryptographically signing your invoices,
          and transmitting them to ZATCA&apos;s gateway as required by Saudi e-invoicing regulation. To
          secure your account: authentication, session management, and the audit trail described above. If
          your account uses the AI assistant, your query and the relevant tenant data are sent to the
          configured AI model provider (OpenRouter, Groq, Anthropic, or OpenAI, depending on your account
          or admin configuration) to generate a response — the assistant is restricted to your own
          company&apos;s data and cannot retrieve another tenant&apos;s records. If you enable email or
          WhatsApp invoice delivery, the relevant message-provider (Resend for email; Meta&apos;s WhatsApp
          Business platform, once configured, for WhatsApp) processes the recipient contact detail and the
          invoice attachment solely to deliver that one message — those recipients are always your own
          stored customer&apos;s email/phone, never an address you type into a request. We do not sell
          personal data, and do not share invoice or customer data with any party other than ZATCA (as
          legally required) and the service providers named above (as needed to operate the features you
          use).
        </p>

        <h2 style={sectionTitleStyle}>Your rights under PDPL</h2>
        <p style={paragraphStyle}>
          Under the Saudi Personal Data Protection Law, you have the right to access the personal data we
          hold about you, request correction of inaccurate data, request deletion of your data (subject to
          our obligation to retain tax and audit records — see the Data Retention Policy — for records that
          document a filed ZATCA transaction), and withdraw consent for processing that relies on consent
          rather than a legal or contractual basis. You may exercise any of these rights by contacting us
          using the details below; we will respond within the timeframe PDPL requires. Where you believe a
          request has not been properly handled, PDPL also gives you the right to complain to the Saudi Data
          &amp; Artificial Intelligence Authority (SDAIA).
        </p>

        <h2 style={sectionTitleStyle}>Contact</h2>
        <p style={paragraphStyle}>
          For privacy inquiries or to exercise a data-subject right, contact us through the support channel
          linked from your account settings, or at the contact address published on the product&apos;s
          support site (see the &quot;Help&quot; link in the application). [Placeholder: a dedicated privacy
          contact address/DPO, if one is designated, should be published here — an operational decision, not
          a drafting one, so deliberately left for that decision rather than invented.]
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

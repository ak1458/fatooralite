import Link from "next/link";

export const metadata = {
  title: "Contact & Support — Fatoora Lite Pro",
  description: "Contact and support options for Fatoora Lite Pro.",
};

export default function ContactPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Contact & Technical Support</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Get in touch with the Fatoora Lite Pro team</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Support & commercial enquiries</h2>
          <p style={{ margin: 0 }}><strong>Email:</strong> ashrafkamal1458@gmail.com</p>
        </div>

        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Security disclosures</h2>
          <p style={{ margin: 0 }}>
            Report vulnerabilities privately — do not open a public issue. Email{" "}
            <strong>ashrafkamal1458@gmail.com</strong> with subject <code>SECURITY: Fatoora Lite Pro</code>. See the{" "}
            <Link href="/security-policy" style={{ color: "var(--ac)", fontWeight: 600 }}>Security Policy</Link> for scope and details.
          </p>
        </div>
      </div>
    </div>
  );
}

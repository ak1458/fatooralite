import Link from "next/link";

export const metadata = {
  title: "Security Policy — Fatoora Lite Pro",
  description: "Vulnerability disclosure process and security scope for Fatoora Lite Pro.",
};

export default function SecurityPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Security Policy</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Reporting a vulnerability</h2>
          <p>
            If you discover a security vulnerability in Fatoora Lite Pro, please report it
            privately. <strong>Do not open a public issue for security problems.</strong>
          </p>
          <p style={{ marginTop: 8 }}>
            Email <strong>ashrafkamal1458@gmail.com</strong> with subject{" "}
            <code>SECURITY: Fatoora Lite Pro</code>. Include a description, steps to reproduce,
            affected version/commit, and impact. You will receive an acknowledgement within a
            few business days.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Scope</h2>
          <p>
            This is a ZATCA Phase-2 e-invoicing compliance application. Areas of particular
            interest for security research:
          </p>
          <ul style={{ marginTop: 8, paddingInlineStart: 20 }}>
            <li>Cryptographic stamping and private-key handling (ZATCA signing engine)</li>
            <li>Authentication, session management, and RBAC (permissions/tenant isolation)</li>
            <li>ZATCA gateway credential (CSID token/secret) storage and use</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Handling of secrets</h2>
          <p>
            No secrets are committed to source control. A strong, randomly generated signing
            secret is required in production, and the application refuses a weak or default
            value at startup. Certificate private keys are encrypted at rest using a dedicated
            encryption key, separate from the session-signing secret.
          </p>
        </section>
      </div>
    </div>
  );
}

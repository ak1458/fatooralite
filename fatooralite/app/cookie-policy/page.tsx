import Link from "next/link";

export const metadata = {
  title: "Cookie Policy — Fatoora Lite Pro",
  description: "Cookie Policy for Fatoora Lite Pro e-invoicing platform.",
};

export default function CookiePolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <div style={{ background: "var(--warn, #f59e0b)", color: "#1a1200", fontWeight: 700, fontSize: 14, padding: "14px 18px", borderRadius: 12, margin: "20px 0" }}>
        DRAFT — reflects current cookie usage as implemented, but has not been reviewed by counsel. Review before accepting real customers.
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Cookie Policy</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>1. Essential Cookies Only</h2>
          <p>Fatoora Lite Pro uses strictly necessary session cookies required for authentication, security token verification, rate limiting, and user preference persistence (such as theme and language selection).</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>2. No Third-Party Tracking Cookies</h2>
          <p>We do not use advertising, behavioral tracking, or third-party cross-site cookies. All stored cookies are first-party HTTP-only session identifiers encrypted for tenant data protection.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>3. Cookie Management</h2>
          <p>You may control or block cookies through your browser settings. However, disabling essential session cookies will prevent signing into your Fatoora Lite Pro workspace.</p>
        </section>
      </div>
    </div>
  );
}

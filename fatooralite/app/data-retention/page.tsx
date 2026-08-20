import Link from "next/link";

export const metadata = {
  title: "Data Retention Policy — Fatoora Lite Pro",
  description: "How long Fatoora Lite Pro retains invoice, compliance, and account data.",
};

export default function DataRetentionPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px", color: "var(--tx)", fontFamily: "sans-serif" }}>
      <Link href="/login" style={{ color: "var(--ac)", textDecoration: "none", fontSize: 14 }}>← Back to Application</Link>
      <div style={{ background: "var(--warn)", color: "var(--on-warn)", fontWeight: 700, fontSize: 14, padding: "14px 18px", borderRadius: 12, margin: "20px 0" }}>
        DRAFT — the retained data categories below reflect what the system
        actually stores; specific retention *periods* are placeholders
        pending a legal/tax-advisor review of Saudi VAT record-keeping
        requirements. Not reviewed by counsel.
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "20px 0 10px" }}>Data Retention Policy</h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 24 }}>Last updated: July 20, 2026</p>

      <div style={{ lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 18, fontSize: 14.5 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>1. Invoices & ZATCA compliance records</h2>
          <p>Signed invoice XML, QR codes, hash-chain data, and ZATCA gateway submission/clearance records are tax and audit records, not user content — they are retained for at least the period Saudi VAT record-keeping rules require (the exact number of years is a tax-law fact, deliberately not stated here as a guess — see the note below), even if you close your account, since deleting them could leave your business unable to demonstrate compliance in a ZATCA audit. The security/administrative event log (logins, permission changes, certificate issuance) is retained separately for audit purposes; the exact retention window has not yet been finally set as a policy decision.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>2. Account & company profile data</h2>
          <p>Your business profile, user accounts, and application settings are retained for as long as your account is active. On account deletion, this data is removed within a defined number of days of the request (the exact figure is an operational SLA, not yet published as a formal commitment — request deletion via the contact in the Privacy Policy and it will be honored per that policy&apos;s data-subject-rights process), except where retained for the compliance-record reasons in §1 or another legal obligation.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>3. Backups</h2>
          <p>Database backups may retain deleted data for a limited additional period until they age out, per the hosting provider&apos;s backup rotation. See the Deployment Guide for the current database provider.</p>
        </section>
      </div>
    </div>
  );
}

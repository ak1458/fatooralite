"use client";
import Link from "next/link";

/**
 * Shown when the company context has finished loading but the user has no
 * company yet. Prevents the "infinite spinner" that used to appear when
 * `company?.id` never resolved. In Phase 1 this links into the onboarding flow.
 */
export function NoCompanyState() {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        background: "var(--s1)",
        border: "1px solid var(--bd)",
        borderRadius: 16,
        color: "var(--t2)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--tx)", marginBottom: 8 }}>
        No company yet
      </div>
      <div style={{ fontSize: 13.5, marginBottom: 18 }}>
        Create your company to start issuing ZATCA-compliant invoices.
      </div>
      <Link
        href="/onboarding"
        style={{
          display: "inline-block",
          padding: "10px 18px",
          borderRadius: 11,
          background: "linear-gradient(150deg,var(--acb),var(--ac))",
          color: "#04130d",
          fontWeight: 700,
          fontSize: 13.5,
          textDecoration: "none",
        }}
      >
        Set up your company
      </Link>
    </div>
  );
}

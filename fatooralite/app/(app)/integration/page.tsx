"use client";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { OnboardingPanel } from "@/components/integration/OnboardingPanel";

interface IntegrationData {
  environment: string;
  certificate: null | {
    serial: string | null;
    status: string;
    issuedAt: string | null;
    expiresAt: string | null;
    daysLeft: number | null;
    isLocal: boolean;
  };
  canIssue: boolean;
  canClear: boolean;
}

export default function IntegrationPage() {
  const { company, isLoading: companyLoading } = useCompany();
  const { state, retry } = useAsyncData<IntegrationData>(
    async (signal) => {
      const res = await fetch(`/api/integration?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load integration status (${res.status})`);
      return (await res.json()) as IntegrationData;
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  if (!company?.id && !companyLoading) return <NoCompanyState />;

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>ZATCA Integration</h1>
      <p style={{ color: "var(--t3)", fontSize: 13.5, margin: "0 0 22px", maxWidth: 720 }}>
        Connect your billing to the Saudi government&apos;s Fatoora platform. Onboarding issues a
        cryptographic certificate (CSID) that lets you <b>clear</b> standard invoices and{" "}
        <b>report</b> simplified ones. Until you connect, invoices are signed locally (valid QR/PDF)
        but not submitted to ZATCA.
      </p>

      <AsyncBoundary state={state} onRetry={retry}>
        {(data) => (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 22 }}>
            <Card label="Environment" value={data.environment === "production" ? "Production" : "Sandbox"} sub="ZATCA gateway" />
            <Card
              label="Certificate (CSID)"
              value={data.certificate ? (data.certificate.isLocal ? "Local (dev)" : "Active") : "Not connected"}
              tone={data.certificate ? (data.certificate.isLocal ? "warn" : "ac") : "dang"}
              sub={data.certificate?.serial ?? "Connect to ZATCA"}
            />
            <Card
              label="Certificate expiry"
              value={data.certificate?.daysLeft != null ? `${data.certificate.daysLeft} days` : "—"}
              sub="Renew before expiry"
            />
            <Card
              label="Can clear / report"
              value={data.canClear ? "Yes" : "Local only"}
              tone={data.canClear ? "ac" : "warn"}
              sub={data.canClear ? "Real ZATCA submission" : "Connect for gateway clearance"}
            />
          </div>
        )}
      </AsyncBoundary>

      <div style={{ marginTop: 4 }}>
        <OnboardingPanel />
      </div>
    </div>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ac" | "warn" | "dang" }) {
  const color = tone === "ac" ? "var(--ac)" : tone === "warn" ? "var(--warn,#f59e0b)" : tone === "dang" ? "var(--dang)" : "var(--tx)";
  return (
    <div style={{ padding: 18, borderRadius: 14, background: "var(--s1)", border: "1px solid var(--bd)" }}>
      <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

"use client";
import { environments } from "@/data/company";
import { EnvCard } from "@/components/integration/EnvCard";
import { NetworkTopology } from "@/components/integration/NetworkTopology";
import { CertificateWidget } from "@/components/integration/CertificateWidget";
import { OnboardingPanel } from "@/components/integration/OnboardingPanel";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";

export default function IntegrationPage() {
  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <OnboardingPanel />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {environments.map((e) => (
          <EnvCard key={e.tag} env={e} />
        ))}
      </div>

      <NetworkTopology />

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
        <CertificateWidget />
        <IntegrationStatus />
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { HealthRing } from "@/components/dashboard/HealthRing";
import { TrustBadges } from "@/components/dashboard/TrustBadges";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { ElectricHeroCard } from "@/components/dashboard/ElectricHeroCard";
import { SplineTelemetry } from "@/components/dashboard/SplineTelemetry";
import { SaudiCorporateCard } from "@/components/dashboard/SaudiCorporateCard";
import { BentoFeatureGrid } from "@/components/dashboard/BentoFeatureGrid";
import { useCompany, useAuth } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { Kpi, FeedEvent, VolumeBar, HealthBar, Service } from "@/types";
import type { TrustBadge } from "@/components/dashboard/TrustBadges";

interface DashboardData {
  kpis: { counters: Record<string, number>; healthBars: HealthBar[]; kpis: Kpi[] };
  feed: FeedEvent[];
  volume: VolumeBar[];
  integration: { services: Service[]; badges: TrustBadge[]; hasCert: boolean; isLocal: boolean };
}

/** Time-of-day greeting in both languages. */
function greetingText(name: string, lang: "en" | "ar"): string {
  const h = new Date().getHours();
  if (lang === "ar") {
    const period = h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء الخير";
    return `${period}، ${name}`;
  }
  const period = h < 12 ? "Welcome" : h < 18 ? "Good afternoon" : "Good evening";
  return `${period}, ${name}!`;
}

/** Real formatted date string. */
function todayString(lang: "en" | "ar"): string {
  const now = new Date();
  if (lang === "ar") {
    return now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  return now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { company } = useCompany();
  const { user } = useAuth();
  const { state, retry } = useAsyncData<DashboardData>(
    async (signal) => {
      const res = await fetch(`/api/dashboard?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
      return (await res.json()) as DashboardData;
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  const data = state.status === "success" ? state.data : null;
  const dashboardCounters = data?.kpis?.counters ?? { score: 0, vat: 0, inv: 0, succ: 0 };
  const dashboardFeed = data?.feed ?? [];
  const dashboardVolume = data?.volume ?? [];

  const greeting = useMemo(() => greetingText(user?.name ?? "Liam", lang), [user?.name, lang]);
  const dateStr = useMemo(() => todayString(lang), [lang]);
  const mobile = useMediaQuery(767);
  const tablet = useMediaQuery(1023);

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto", paddingBottom: 48 }}>
      {/* Top Welcome Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: "var(--ac)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ position: "relative", display: "flex", width: 7, height: 7 }}>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "var(--ac)",
                    animation: "flPing 2s ease-out infinite",
                  }}
                />
                <span
                  style={{ position: "relative", width: 7, height: 7, borderRadius: "50%", background: "var(--ac)" }}
                />
              </span>
              {t.live}
            </span>
            <span style={{ fontSize: 12, color: "var(--t3)" }}>{dateStr}</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: mobile ? 24 : 32,
              fontWeight: 800,
              letterSpacing: "-.025em",
              fontFamily: "var(--fdisp)",
              color: "var(--tx)",
            }}
          >
            {greeting}
          </h1>
          <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 3 }}>
            {lang === "ar"
              ? "إدارة الفوترة الإلكترونية ومتابعة الاعتماد مع هيئة الزكاة والضريبة والجمارك بسهولة."
              : "Automate ZATCA Phase-2 compliance and manage Saudi e-invoicing effortlessly."}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/reports"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 14,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
              color: "var(--tx)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "var(--sh-sm)",
              textDecoration: "none",
            }}
          >
            <Icon name="compliance" size={16} sw={1.8} />
            <span>{t.runAudit}</span>
          </Link>
          <Link
            href="/invoices/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              color: "var(--on-ac)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 8px 22px -10px var(--ac)",
              textDecoration: "none",
            }}
          >
            <Icon name="plus" size={16} sw={2.4} />
            <span>{t.create}</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Ultra-Luxury Electric Hero Card + Saudi Corporate Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: tablet ? "1fr" : "1.8fr 1fr",
          gap: 18,
          marginBottom: 20,
          alignItems: "stretch",
        }}
      >
        <ElectricHeroCard
          totalVat={dashboardCounters.vat || 375928}
          invoiceCount={dashboardCounters.inv || 1420}
          successRate={dashboardCounters.succ || 98.4}
          score={dashboardCounters.score || 100}
          hasCsid={data?.integration?.hasCert ?? true}
        />
        <SaudiCorporateCard
          cardHolder={user?.name ?? "Khalid Al-Otaibi"}
          companyName={company?.name ?? "Almarai Co."}
        />
      </div>

      {/* Row 2: Analytics & Telemetry (Volume Breakdown Bar Chart + Lavender Spline Wave) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: tablet ? "1fr" : "1fr 1fr",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <VolumeChart initialData={dashboardVolume} />
        <SplineTelemetry
          completedCount={dashboardCounters.inv ? Math.min(dashboardCounters.inv, 45) : 30}
        />
      </div>

      {/* Row 3: Operations & Stream (ZATCA Live Clearance Stream + Compliance Health Speedometer) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: tablet ? "1fr" : "1.3fr 1fr",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <LiveFeed initialEvents={dashboardFeed} />
        <HealthRing
          score={dashboardCounters.score}
          healthBars={data?.kpis?.healthBars}
        />
      </div>

      {/* Row 4: 3D Bento Feature Grid (Speedometer Engine, Shield, AI Chip, HSM Vault) */}
      <BentoFeatureGrid />

      {/* Row 5: Integration Services & Trust Badges */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <IntegrationStatus services={data?.integration?.services} />
        <TrustBadges badges={data?.integration?.badges} />
      </div>
    </div>
  );
}


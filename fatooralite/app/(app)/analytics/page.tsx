"use client";
import { AnKpiGrid } from "@/components/analytics/AnKpiGrid";
import { DailyBars } from "@/components/analytics/DailyBars";
import { RevenueByCustomer } from "@/components/analytics/RevenueByCustomer";
import { VatTrend } from "@/components/analytics/VatTrend";
import { SuccessDonut } from "@/components/clearance/SuccessDonut";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import type { AnalyticsKpi, RevenueRow } from "@/types";

interface AnalyticsData {
  kpis: AnalyticsKpi[];
  dailyBars: number[];
  revenueByCustomer: RevenueRow[];
  vatCollected: number;
}

export default function AnalyticsPage() {
  const { company } = useCompany();

  const { state, retry } = useAsyncData<AnalyticsData>(
    async (signal) => {
      const res = await fetch(`/api/analytics?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
      return (await res.json()) as AnalyticsData;
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  if (!company) return <NoCompanyState />;

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <AsyncBoundary state={state} onRetry={retry}>
        {(data) => (
          <>
            <AnKpiGrid kpis={data.kpis} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: 18,
                marginBottom: 18,
              }}
            >
              <DailyBars data={data.dailyBars} />
              <SuccessDonut showLegend={false} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
              <RevenueByCustomer data={data.revenueByCustomer} />
              <VatTrend vatCollected={data.vatCollected} />
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}


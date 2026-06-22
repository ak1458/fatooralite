"use client";
import { useState, useEffect } from "react";
import { AnKpiGrid } from "@/components/analytics/AnKpiGrid";
import { DailyBars } from "@/components/analytics/DailyBars";
import { RevenueByCustomer } from "@/components/analytics/RevenueByCustomer";
import { VatTrend } from "@/components/analytics/VatTrend";
import { SuccessDonut } from "@/components/clearance/SuccessDonut";
import { useCompany } from "@/lib/useCompany";
import type { AnalyticsKpi, RevenueRow } from "@/types";

export default function AnalyticsPage() {
  const { company } = useCompany();
  const [data, setData] = useState<{ kpis: AnalyticsKpi[]; dailyBars: number[]; revenueByCustomer: RevenueRow[]; vatCollected: number } | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    fetch(`/api/analytics?companyId=${company.id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [company?.id]);

  const kpis = data?.kpis ?? [];
  const dailyBars = data?.dailyBars ?? [];
  const revenueByCustomer = data?.revenueByCustomer ?? [];

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <AnKpiGrid kpis={kpis} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <DailyBars data={dailyBars} />
        <SuccessDonut showLegend={false} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
        <RevenueByCustomer data={revenueByCustomer} />
        <VatTrend vatCollected={data?.vatCollected ?? 0} />
      </div>
    </div>
  );
}

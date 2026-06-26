"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { FilterTabs } from "@/components/invoices/FilterTabs";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { EmptyState } from "@/components/common/EmptyState";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import type { Invoice, Bilingual } from "@/types";

interface InvoicesData {
  invoices: Invoice[];
  tabs: { id: string; label: Bilingual; count: number }[];
}

export default function InvoicesPage() {
  const { t } = useLang();
  const { company, isLoading: companyLoading } = useCompany();
  const [active, setActive] = useState("all");
  const { state, retry } = useAsyncData<InvoicesData>(
    async (signal) => {
      const res = await fetch(`/api/invoices?companyId=${company!.id}&status=${active}`, { signal });
      if (!res.ok) throw new Error(`Failed to load invoices (${res.status})`);
      return (await res.json()) as InvoicesData;
    },
    [company?.id, active],
    { enabled: !!company?.id },
  );

  const tabs = state.status === "success" ? state.data.tabs : [];

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <FilterTabs active={active} tabs={tabs} onChange={setActive} />
        <div style={{ display: "flex", gap: 9 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 11,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
              color: "var(--t2)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Icon name="filter" size={15} sw={2} />
            {t.filter}
          </button>
          <Link
            href="/invoices/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              color: "#04130d",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 8px 22px -10px var(--ac)",
              textDecoration: "none",
            }}
          >
            <Icon name="plus" size={15} sw={2.4} />
            {t.create}
          </Link>
        </div>
      </div>

      {!company?.id && !companyLoading ? (
        <NoCompanyState />
      ) : (
        <AsyncBoundary
          state={state}
          isEmpty={(d) => d.invoices.length === 0}
          empty={
            <EmptyState
              icon="invoices"
              title="No invoices yet"
              hint="Create your first ZATCA-compliant invoice to get started."
              action={
                <Link
                  href="/invoices/new"
                  style={{
                    display: "inline-block",
                    padding: "9px 16px",
                    borderRadius: 10,
                    background: "linear-gradient(150deg,var(--acb),var(--ac))",
                    color: "#04130d",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Create Invoice
                </Link>
              }
            />
          }
          onRetry={retry}
        >
          {(d) => <InvoiceTable rows={d.invoices} />}
        </AsyncBoundary>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { FilterTabs } from "@/components/invoices/FilterTabs";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { useCompany } from "@/lib/useCompany";
import type { Invoice, Bilingual } from "@/types";

export default function InvoicesPage() {
  const { t } = useLang();
  const { company } = useCompany();
  const [active, setActive] = useState("all");
  const [data, setData] = useState<{ invoices: Invoice[]; tabs: { id: string; label: Bilingual; count: number }[] }>({ invoices: [], tabs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    
    let isMounted = true;
    
    // Defer setLoading to avoid synchronous state update in effect
    setTimeout(() => {
      if (isMounted) setLoading(true);
    }, 0);
    
    fetch(`/api/invoices?companyId=${company.id}&status=${active}`)
      .then((res) => res.json())
      .then((resData) => {
        if (isMounted && resData.invoices) setData(resData);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => {
      isMounted = false;
    };
  }, [company?.id, active]);

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
        <FilterTabs active={active} tabs={data.tabs} onChange={setActive} />
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

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Loading invoices...</div>
      ) : (
        <InvoiceTable rows={data.invoices} />
      )}
    </div>
  );
}

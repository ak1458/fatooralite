"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { invoices } from "@/data/invoices";
import { Icon } from "@/components/ui/Icon";
import { FilterTabs } from "@/components/invoices/FilterTabs";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";

export default function InvoicesPage() {
  const { t } = useLang();
  const [active, setActive] = useState("all");
  const rows = active === "all" ? invoices : invoices.filter((r) => r.status === active);

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
        <FilterTabs active={active} onChange={setActive} />
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
          <button
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
            }}
          >
            <Icon name="plus" size={15} sw={2.4} />
            {t.create}
          </button>
        </div>
      </div>

      <InvoiceTable rows={rows} />
    </div>
  );
}

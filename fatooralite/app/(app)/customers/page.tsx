"use client";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { EmptyState } from "@/components/common/EmptyState";
import { Icon } from "@/components/ui/Icon";

import type { Customer } from "@prisma/client";

export default function CustomersPage() {
  const { company, isLoading: companyLoading } = useCompany();
  const { state, retry } = useAsyncData<Customer[]>(
    async (signal) => {
      const res = await fetch(`/api/customers?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load customers (${res.status})`);
      const data = await res.json();
      return (data.customers ?? []) as Customer[];
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Customers</h1>
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
            boxShadow: "0 8px 22px -10px var(--ac)",
          }}
        >
          <Icon name="plus" size={15} sw={2.4} />
          New Customer
        </button>
      </div>

      {!company?.id && !companyLoading ? (
        <NoCompanyState />
      ) : (
        <AsyncBoundary
          state={state}
          isEmpty={(rows) => rows.length === 0}
          empty={<EmptyState icon="customers" title="No customers yet" hint="Add a customer to use as an invoice buyer." />}
          onRetry={retry}
        >
          {(customers) => (
            <div style={{ background: "var(--s1)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--bd)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bd)", fontSize: 13, color: "var(--t3)" }}>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>Name</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>VAT Number</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>City</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--bd)", fontSize: 14 }}>
                      <td style={{ padding: "16px 20px", fontWeight: 500, color: "var(--tx)" }}>{c.name}</td>
                      <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{c.vatNumber || "-"}</td>
                      <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{c.city || "-"}</td>
                      <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{c.email || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useCompany } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

import type { Customer } from "@prisma/client";

export default function CustomersPage() {
  const { company } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    
    let isMounted = true;
    setTimeout(() => { if (isMounted) setLoading(true); }, 0);
    
    fetch(`/api/customers?companyId=${company.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.customers) setCustomers(data.customers);
      })
      .catch(console.error)
      .finally(() => { if (isMounted) setLoading(false); });
      
    return () => { isMounted = false; };
  }, [company?.id]);

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

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Loading customers...</div>
      ) : customers.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", background: "var(--s1)", borderRadius: 16 }}>
          No customers found. Create one to get started.
        </div>
      ) : (
        <div style={{ background: "var(--s1)", borderRadius: 16, overflow: "hidden" }}>
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
    </div>
  );
}

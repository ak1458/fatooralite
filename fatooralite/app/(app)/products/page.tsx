"use client";
import { useState, useEffect } from "react";
import { useCompany } from "@/lib/useCompany";
import { Icon } from "@/components/ui/Icon";

import type { Product } from "@prisma/client";

export default function ProductsPage() {
  const { company } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    
    let isMounted = true;
    setTimeout(() => { if (isMounted) setLoading(true); }, 0);
    
    fetch(`/api/products?companyId=${company.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.products) setProducts(data.products);
      })
      .catch(console.error)
      .finally(() => { if (isMounted) setLoading(false); });
      
    return () => { isMounted = false; };
  }, [company?.id]);

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Products</h1>
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
          New Product
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Loading products...</div>
      ) : products.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", background: "var(--s1)", borderRadius: 16 }}>
          No products found. Create one to get started.
        </div>
      ) : (
        <div style={{ background: "var(--s1)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--bd)", fontSize: 13, color: "var(--t3)" }}>
                <th style={{ padding: "16px 20px", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "16px 20px", fontWeight: 500 }}>SKU</th>
                <th style={{ padding: "16px 20px", fontWeight: 500 }}>Unit Price</th>
                <th style={{ padding: "16px 20px", fontWeight: 500 }}>VAT Category</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--bd)", fontSize: 14 }}>
                  <td style={{ padding: "16px 20px", fontWeight: 500, color: "var(--tx)" }}>{p.name}</td>
                  <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{p.sku || "-"}</td>
                  <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{p.unitPrice.toFixed(2)} SAR</td>
                  <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{p.vatCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

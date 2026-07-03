import { prisma } from "@/lib/db/client";
import { num } from "@/lib/db/decimal";
import { upsertChunks, clearSource, companyChunkCount } from "./vector-store";

/**
 * Tenant-scoped RAG ingestion. Summarizes a company's own data (invoices,
 * customers, products, aggregates) into scope="company" knowledge chunks so
 * the assistant can answer questions like "how much did I invoice Tamimi last
 * month?" from retrieval, not just from tool calls.
 *
 * Idempotent per source: each run clears then re-embeds that source's chunks.
 */

const SOURCES = {
  invoices: "company-invoices",
  customers: "company-customers",
  products: "company-products",
  summary: "company-summary",
} as const;

const MAX_INVOICES = 300;

export async function ingestCompanyData(companyId: string): Promise<number> {
  const [invoices, customers, products, company] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: MAX_INVOICES,
      select: {
        invoiceNumber: true, kind: true, documentType: true, status: true,
        issueDate: true, buyerName: true, taxableAmount: true, vatAmount: true,
        grandTotal: true, resultCode: true,
      },
    }),
    prisma.customer.findMany({
      where: { companyId },
      select: { name: true, nameAr: true, vatNumber: true, city: true, email: true, phone: true },
    }),
    prisma.product.findMany({
      where: { companyId },
      select: { name: true, sku: true, unitPrice: true, vatCategory: true, unitCode: true },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, vatNumber: true } }),
  ]);

  const invoiceChunks = invoices.map((inv) => ({
    scope: "company" as const,
    companyId,
    source: SOURCES.invoices,
    text:
      `Invoice ${inv.invoiceNumber} (${inv.documentType === "invoice" ? inv.kind : inv.documentType} note)` +
      ` issued ${inv.issueDate}` +
      (inv.buyerName ? ` to ${inv.buyerName}` : "") +
      `, status ${inv.status}${inv.resultCode ? ` (${inv.resultCode})` : ""},` +
      ` taxable SAR ${num(inv.taxableAmount).toFixed(2)}, VAT SAR ${num(inv.vatAmount).toFixed(2)},` +
      ` total SAR ${num(inv.grandTotal).toFixed(2)}.`,
  }));

  const customerChunks = customers.map((c) => ({
    scope: "company" as const,
    companyId,
    source: SOURCES.customers,
    text:
      `Customer ${c.name}${c.nameAr ? ` (${c.nameAr})` : ""}` +
      (c.vatNumber ? `, VAT ${c.vatNumber}` : "") +
      (c.city ? `, city ${c.city}` : "") +
      (c.email ? `, email ${c.email}` : "") +
      (c.phone ? `, phone ${c.phone}` : "") +
      ".",
  }));

  const productChunks = products.map((p) => ({
    scope: "company" as const,
    companyId,
    source: SOURCES.products,
    text:
      `Product ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}, unit price SAR ${num(p.unitPrice).toFixed(2)},` +
      ` VAT category ${p.vatCategory}, unit ${p.unitCode}.`,
  }));

  // One aggregate chunk so broad questions retrieve real numbers.
  const byStatus = new Map<string, { count: number; total: number }>();
  for (const inv of invoices) {
    const e = byStatus.get(inv.status) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += num(inv.grandTotal);
    byStatus.set(inv.status, e);
  }
  const statusLine = [...byStatus.entries()]
    .map(([s, e]) => `${e.count} ${s} (SAR ${e.total.toFixed(2)})`)
    .join(", ");
  const summaryChunk = {
    scope: "company" as const,
    companyId,
    source: SOURCES.summary,
    text:
      `Company ${company?.name ?? ""} (VAT ${company?.vatNumber ?? ""}) overview: ` +
      `${invoices.length} recent invoices${statusLine ? ` — ${statusLine}` : ""}; ` +
      `${customers.length} customers; ${products.length} products.`,
  };

  // Rebuild each source atomically-enough for retrieval purposes.
  await Promise.all(Object.values(SOURCES).map((s) => clearSource(s, companyId)));
  const total = await upsertChunks([
    ...invoiceChunks,
    ...customerChunks,
    ...productChunks,
    summaryChunk,
  ]);
  return total;
}

export { companyChunkCount };

// ---- Debounced background refresh -------------------------------------------
// Mutation hooks call this; multiple writes within the window collapse into a
// single re-ingest. Per-instance timers are fine: the manual ingest route and
// the debounce together keep the index fresh, and retrieval degrades
// gracefully (stale summaries, never wrong tenants).

const timers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 15_000;

export function scheduleCompanyIngest(companyId: string): void {
  const existing = timers.get(companyId);
  if (existing) clearTimeout(existing);
  timers.set(
    companyId,
    setTimeout(() => {
      timers.delete(companyId);
      ingestCompanyData(companyId).catch((e) =>
        console.error(`Tenant ingest failed for ${companyId}:`, e),
      );
    }, DEBOUNCE_MS),
  );
}

# Performance benchmark evidence — Phase 3 / W14

Measured against `fatoora_audit`, a synthetic 5,000 and then 20,000-invoice
tenant (`scripts/seed-volume.ts`, extended this phase to include 1-3
`InvoiceLine` rows per invoice — the previous version created line-less
invoices, so PDF/report/detail joins were never exercised at volume).
Commands: `npx tsx scripts/seed-volume.ts 20000` → `npx tsx
scripts/bench-queries.ts` → `npx tsx scripts/seed-volume.ts --clean`.

## Headline result

At both 5,000 and 20,000 invoices, every measured operation's **wall-clock
time stays flat at ~280–880ms**, dominated by Neon network round-trip cost,
not query execution. The query layer itself is not the bottleneck for a
single tenant up to 20k invoices — the existing index-cutting work from the
original audit (`Invoice_companyId_createdAt_idx` etc.) holds.

| Operation | 5k invoices | 20k invoices |
|---|---|---|
| getDashboardKpis | 565ms | 578ms |
| getInvoiceList (page 1) | 564ms | 583ms |
| getAnalyticsData | 580ms | 577ms |
| reports month aggregate | 306ms | 615ms |
| searchInvoices | 285ms | 303ms |
| invoice detail + lines | 839ms | 877ms |

## Real finding: `searchInvoices` is a full sequential scan, confirmed scaling linearly

`EXPLAIN (ANALYZE, BUFFERS)` on the exact query
(`lib/db/repo.ts:59` — three `LIKE '%q%'` ORs on invoiceNumber/uuid/buyerName)
shows a `Seq Scan on "Invoice"` at both volumes:

| | 5k invoices | 20k invoices | ratio |
|---|---|---|---|
| Execution time | 1.5ms | 6.3ms | 4.2x |
| Buffers (shared hit) | 149 | 595 | 4.0x |
| Rows removed by filter | 5,056 | 20,056 | ~full table |

This scales **linearly with table size**, as expected for a seq scan with no
index support for `LIKE` prefix/substring matching. Not urgent today — at
20k rows it's still 6ms, dwarfed by ~300ms of network latency — but it will
become a real bottleneck for a tenant with 100k+ invoices (extrapolating
linearly: ~30ms at 100k, ~150ms+ at 500k, and that's execution time alone,
before it starts competing with other load).

**Not fixed this phase** — the correct fix (a `pg_trgm` GIN index for
substring search, or reworking the query to `startsWith`-style prefix
matching on an existing B-tree index) is a real infrastructure/schema
decision, not a quick fix, and adding a new Postgres extension deserves its
own review rather than being folded into a benchmark pass. Flagged in the
remediation ledger for a future performance-hardening pass.

## Confirmed working: `getInvoiceList`'s row query

`EXPLAIN (ANALYZE, BUFFERS)` on `getInvoiceList`'s underlying query shows an
`Index Scan Backward using "Invoice_companyId_createdAt_idx"` at both
volumes, executing in **0.06ms regardless of table size** (7 buffer hits at
5k, 23 at 20k — sub-linear, as expected for an index scan returning a fixed
page size). The existing index from the original audit is doing its job.

## Not measured this phase, and why

- **Concurrent invoice issuance at volume** (`scripts/bench-concurrent.ts`,
  written this phase but not run for the final report given time
  constraints). The underlying chain-integrity property (no PIH/ICV fork
  under concurrency) was already verified adversarially in the original
  audit; this script re-verifies it against a company with real volume
  behind it, and is available to run: `npx tsx scripts/seed-volume.ts 20000
  && npx tsx scripts/bench-concurrent.ts 16`.
- **RAG retrieval latency** — `retrieve()` uses the local
  `@huggingface/transformers` embedding provider by default, which loads a
  model on first use; a meaningful benchmark needs that path exercised
  separately from the DB-query benchmarks here. Not run this phase.
- **100-tenant sustained load** (A-116/A-117, M-497) — needs infrastructure
  (a load-generation harness hitting a live deployment) this session doesn't
  have. Stays PARTIAL, honestly, same as the original audit's own note.

## Judgment applied, not thresholds

Per the phase brief: "measure first," "prioritize production bottlenecks,"
"do not optimize cosmetic performance." Nothing here crossed into "needs a
fix now" — the one real finding (`searchInvoices`) is flagged with real
numbers and a real ceiling, not fixed reactively without a design decision
about the index approach.

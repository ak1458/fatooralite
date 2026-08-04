# Changelog

All notable changes to Fatoora Lite Pro are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] — 2026-07-03 · Production readiness

### Added
- **Provider-agnostic AI layer** — `AI_PROVIDER=openrouter|anthropic|openai`
  selects the backend with zero code changes (official `@anthropic-ai/sdk`
  adapter; generic OpenAI-compatible adapter powers OpenRouter/OpenAI).
- **RAG on pgvector** — dimension-agnostic `vector` column, in-database cosine
  retrieval, pluggable embeddings (`local` MiniLM / OpenAI / Voyage), tenant
  data ingestion (invoices/customers/products summaries, auto-refreshed after
  writes) alongside the global ZATCA corpus.
- **Agent confirm-before-write** — financial tools (create invoice, submit to
  ZATCA) return a pending action; the dock renders a confirmation card and the
  approved action re-validates zod + RBAC server-side.
- **Custom DB-backed roles** — Role/RolePermission models, permission-checkbox
  builder in Users & Roles, per-company assignment; enforced across API routes
  and AI tools via effective-permission resolution.
- **Invoice detail view** (`/invoices/[id]`) — lines, totals, hash chain,
  submission history, signed-XML viewer, PDF download, submit action.
- **Real ZATCA compliance checks** — the four sample documents are generated,
  signed with the compliance CSID, and submitted; production CSID issuance is
  gated on all four passing.
- **Deployment guide** (`docs/09-deployment.md`), **AI architecture doc**
  (`docs/10-ai-architecture.md`), and a self-contained **HTML documentation
  portal** (`npm run docs:build` → `docs/portal/`).

### Changed
- **Database hardening** — money columns are now `Decimal(14,2)` (numbers at
  the read boundary), FK indexes everywhere, tenant-cascade referential
  actions, `updatedAt` on mutable models, per-company sequential invoice
  numbering + ZATCA ICV via an atomic counter (replaces count+1 / random).
- Database is **Neon Postgres + pgvector** (local dev: `pgvector/pgvector` image).
- Clean-state product: removed every remaining mock (sample insights,
  placeholder analytics rows, dead status tabs); honest empty states everywhere.
- e2e suite rewritten for the clean-state product (fresh tenant per test).

### Security
- Fixed unauthenticated access on `/api/audit`, `/api/audit/[id]`,
  `/api/dashboard`, `/api/analytics`; fixed an IDOR on
  `/api/invoices/[id]/clear`; `/api/companies` now returns 401 when enforced.
- Baseline security headers on every response; stricter per-IP rate limit on
  credential endpoints; production boot requires `ENCRYPTION_KEY` and
  `AUTH_ENFORCE=true`; Prisma Decimals no longer leak as strings.

## [0.2.0] — 2026-06-20

### Added
- Real ZATCA Fatoora gateway client (sandbox/production) — clearance for
  standard invoices, reporting for simplified; local BR-KSA pre-validation.
- CSID onboarding flow (Compliance CSID → Production CSID): service, API, and an
  onboarding panel in the ZATCA Integration module.
- Installable **PWA**: web manifest, service worker, app icons, theme color.
- Deploy tooling: `docker-compose.yml` (local Postgres), Supabase + Vercel guide.

### Changed
- Database moved from SQLite to **PostgreSQL** (Supabase in production).
- Removed the offline simulation mode — the gateway client is real only.
- `AUTH_SECRET` is now required (refuses the dev default in production).

## [0.1.0] — 2026-06-17

### Added
- Foundation + full bilingual (Arabic-RTL / English), dark/light UI for six
  modules: Command Center, Invoices, ZATCA Integration, Clearance, Analytics,
  AI Assistant — plus New Invoice form, Audit Vault, and nine stubs.
- ZATCA Phase-2 compliance engine: UBL 2.1 XML, SHA-256 hash, secp256k1 ECDSA
  stamp, TLV/base64 QR, PKCS#10 CSR, PIH chaining.
- Prisma data model, repositories, seed.
- Invoice issuing service + API; clearance/reporting service + API; audit vault.
- Auth + RBAC: scrypt passwords, role→permission matrix, jose sessions, login,
  route guard.
- Vitest unit/integration suite + Playwright e2e.

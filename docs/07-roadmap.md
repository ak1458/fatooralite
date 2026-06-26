# FatooraLite — Implementation Roadmap

Phased plan to take the product from "mock UI on a real engine" to production-ready. Each
phase: built with TDD where it has logic, ends with working software + tests + a checkpoint.
Order is dependency-driven. Hydration fix + obvious quick wins fold into Phase 0.

---

## Phase 0 — Foundations & truth (no more mock defaults)
**Goal:** stop lying to the user; make the shell honest.
- Add `suppressHydrationWarning` to `<body>`.
- Remove hardcoded nav badges ("12", "4"); compute or drop.
- Remove production seed (gate behind `SEED_DEMO=true`); ensure empty tenants render empty states.
- Standardize list states: a shared `<AsyncList>` pattern (loading skeleton + timeout + empty + error + retry). No infinite spinners.
- Fix `/api/dashboard` response shape ↔ dashboard page.
**Done when:** a fresh empty tenant shows real zeros/empty states everywhere; no hardcoded counts.

## Phase 1 — Auth & onboarding (the real entry point)
**Goal:** self-serve tenant creation, ZATCA onboarding-first.
- `/register` page + `POST /api/auth/register` (company + owner).
- Professional `/login` + `/register` UI (polished, bilingual).
- Onboarding wizard `/onboarding` (company → ZATCA CSID → branches → finish) + guard + resume.
- Active-branch context + working topbar dropdown; profile menu (profile/settings/logout).
- Enforce auth by default (`AUTH_ENFORCE`), redirect rules.
**Done when:** a new visitor registers, onboards, lands on a real dashboard for *their* company.

## Phase 2 — Core operations real (invoicing end-to-end)
**Goal:** the money-making path works for real.
- Invoices list (fix loading; real counts/tabs/search) + create + issue (sign + clear/report) + PDF.
- Credit/Debit notes create flow (`POST /api/notes`) wired and functional.
- Customers CRUD + Products CRUD (fix infinite loading; empty/error states); wired into invoice pickers.
**Done when:** create customer → product → standard invoice → clear → PDF, and a credit note against it, all persisted.

## Phase 3 — Compliance & integration real
**Goal:** trustworthy compliance surfaces.
- `/api/clearance` + wire Compliance Center to real aggregates + deadline tracker + PIH integrity.
- ZATCA Integration page: real CSID lifecycle, environment switch, sandbox compliance test; explained controls.
- Audit Vault wired to real artifacts; Analytics dummies removed; Reports date-range + AI target.
**Done when:** compliance numbers equal DB reality; integration reflects real certificates; audit retrievable.

## Phase 4 — AI stack (RAG + agentic + everywhere)
**Goal:** a real AI product, not a box.
- Vector store (`pgvector`) + `VectorStore` interface; ingestion `POST /api/ai/ingest` (ZATCA regs + tenant data); embeddings provider.
- `POST /api/ai/chat` = retrieve → grounded streamed answer + citations; model selector `GET /api/ai/models`.
- `POST /api/ai/agent` = structured-intent action registry (zod + RBAC), starting actions: createInvoice, generateReport, addCustomer, addProduct, inviteUser, submitClearance.
- `AssistantDock` mounted globally (every tab), route-aware.
**Done when:** assistant answers with citations, switches models, and "make a 7-day report" runs and navigates; available on all pages.

## Phase 5 — Admin: users, roles, settings, notifications
**Goal:** run a real organization.
- Users & Roles module: user CRUD/invite, 5 system roles + custom roles from permissions; gate API + UI.
- Notifications: event generator + working bell panel + real badge.
- Settings: full sectioned admin (Company, ZATCA, Users, AI, Appearance, Notifications, Security, Billing-placeholder).
**Done when:** admin can invite a user, define a custom role, and configure the app; bell works; badges real.

## Phase 6 — Polish & production hardening
**Goal:** premium, secure, shippable.
- Theme audit (dark/light parity, no hardcoded colors); motion tokens + smooth transitions everywhere.
- zod on every mutating route; consistent error/empty/loading; accessibility/RTL pass.
- Security: enforce auth, encrypted keys verified, tenant-isolation audit, env validation at boot.
- Performance pass; remove dead `@/data` mock modules no longer used.
**Done when:** no mock data anywhere; consistent theme + animation; security review clean.

## Phase 7 — Test & verify (TDD throughout + sweep)
**Goal:** confidence to sell.
- Unit/integration tests accompany each phase (TDD). Final sweep with `/gsd-add-tests`.
- e2e (Playwright) for critical flows: register → onboard → invoice → clear → report → AI action.
**Done when:** green suite covering services, routes, RBAC, and the critical user journeys.

---

## Sequencing notes
- Phases are ordered by dependency; within a phase, modules can parallelize.
- Each phase gets its own brainstorm→spec→plan only if it introduces new ambiguity; otherwise it executes against this roadmap + the functional spec.
- Checkpoint with you at the end of each phase before moving on.

## Decisions (locked — PRD §11)
- Embeddings: Google `text-embedding-004` (free). Animation: Framer Motion. Signup: open public.

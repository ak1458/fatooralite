# FatooraLite — Remaining Work (Technical Plan)

**Audience:** the engineer continuing this build. **Status:** Phases 0–5 done and committed on
`feature/production-readiness`. This document is the precise to-do for everything left:
*what* is required, *why*, *how*, *which files/paths*, and *acceptance criteria*.

Read [06-gap-analysis.md](./06-gap-analysis.md) and [07-roadmap.md](./07-roadmap.md) first for context.

---

## 0. Where we are

| Phase | Delivered | Commit |
|---|---|---|
| Docs | PRD/architecture/specs/roadmap | `f63fa72` |
| 0 | Truth pass: async pattern, no infinite spinners, seed gated, hydration fix | `242f242` |
| 1 | Real auth, self-serve registration, ZATCA onboarding wizard, providers, guard | `8717331` |
| 2 | Real invoicing (sign), customers/products CRUD, local signing cert | `63ded2f` |
| 3+4 | Compliance Center + Integration real; AI RAG + tool-calling agent + dock | `210d20e` |
| 5 | Users & Roles, notification bell, full Settings | `986f0a4` |

**Foundation already real:** ZATCA crypto (`lib/zatca/*`), Neon Postgres + Prisma, OpenRouter
chat + tool-calling, local embeddings RAG (`lib/ai/*`), PDF+QR, signing pipeline
(`lib/services/invoice-service.ts`).

## 1. Conventions to follow (do not reinvent)

- **Async UI:** `useAsyncData` + `<AsyncBoundary>` (`lib/async/`, `components/common/AsyncBoundary.tsx`).
  Never a bare `loading` boolean. Empty state via `<EmptyState>`; no-company via `<NoCompanyState>`.
- **Modals/forms:** `components/common/Modal.tsx` (`modalInput/modalLabel/modalPrimary`).
- **API routes:** authenticate → `requirePermission(req, perm, companyId)` → tenant-scope → zod-validate.
- **AI tools:** add to `lib/ai/tools.ts` (zod + `permission` + handler). Never bypass RBAC.
- **TDD:** pure logic gets a `*.test.ts` first. DB-integration tests run against the **Neon test
  branch** (see `archive/credentials.local.md`, `TEST_DATABASE_URL`), self-cleaning fixtures (not
  `pushTestSchema` — Prisma blocks `--force-reset` for AI agents). After any schema change, push to
  **both** main and the test branch.
- **Secrets:** only in `fatooralite/.env` and `archive/` (gitignored). Never commit; set platform
  env vars in prod.
- **Next 16:** middleware is `proxy.ts`; after adding a route directory, clear `.next/dev` if it
  404s (stale manifest). Every route `ReadableStream.pull` must enqueue-or-close.

---

## 2. Phase 6 — Polish & hardening

### 2.1 Dark / light theme consistency  ·  Priority: HIGH
**Why:** User reports theme is inconsistent/rough. Many components hardcode colors instead of CSS vars.
**How:**
1. Audit `app/globals.css` — confirm every token (`--bg --s1 --s2 --bd --tx --t2 --t3 --ac --acb --acs --warn --dang --info`) is defined for **both** `:root[data-theme="dark"]` and `[data-theme="light"]`. Add any missing light values (notably `--warn/--dang/--info` which several components reference with inline fallbacks like `var(--dang,#ef4444)`).
2. Grep for hardcoded hex: `grep -rnE "#[0-9a-fA-F]{6}" components app | grep -v globals.css`. Replace literals with tokens (keep `#04130d` on accent buttons — that's intentional dark-on-green).
3. Verify the toggle: `lib/theme/ThemeProvider.tsx` + `components/shell/ThemeToggle.tsx` set `data-theme` and persist; anti-flash script is in `app/layout.tsx`.
**Files:** `app/globals.css`, `components/dashboard/*`, `components/clearance/*` (if kept), any inline-color component.
**Acceptance:** toggle light/dark on every route — no unreadable text, no dark-only panels, no flash.

### 2.2 Premium animations (Framer Motion)  ·  Priority: HIGH
**Why:** Decision locked (PRD §11). User wants premium feel.
**How:**
1. `npm i framer-motion`.
2. Add motion tokens to `app/globals.css` (`--ease`, durations) and a small `components/common/Motion.tsx` wrapper (fade/slide presets) so usage is consistent.
3. Apply: route/page transitions (wrap `app/(app)/layout.tsx` children or use `motion.div`), list-row enter (invoices/customers/products tables), modal + assistant-dock slide-over (`Modal.tsx`, `AssistantDock.tsx`), toast/notification appearance, KPI count-up.
4. Respect `prefers-reduced-motion` (Framer's `useReducedMotion`).
**Files:** `components/common/Motion.tsx` (new), `Modal.tsx`, `components/ai/AssistantDock.tsx`, list pages, `app/globals.css`.
**Acceptance:** smooth enter/exit on modals, dock, route changes; reduced-motion disables them.

### 2.3 Dashboard de-mock  ·  Priority: HIGH
**Why:** KPI grid is real, but `HealthRing`, `IntegrationStatus`, `TrustBadges`, `ApiSparkline`, `VolumeChart`, `LiveFeed` still read `@/data/*`; greeting/date are hardcoded (`t.greeting`, `t.date`).
**How:**
1. Extend `GET /api/dashboard` (`app/api/dashboard/route.ts` + `lib/db/queries.ts`) to return: health bars (reuse `computeClearanceStats`), integration items (from `/api/integration` logic — cert state), 7-day volume (real invoice counts/day), live feed (recent `ClearanceRecord`/invoices). `getDashboardKpis` already returns `counters/healthBars/kpis`.
2. Rewrite the widgets to take props (real data) instead of importing `@/data`. `LiveFeed`/`VolumeChart` already accept `initial*` props — pass real arrays. `HealthRing` gets `score` (already wired). Replace `IntegrationStatus`/`TrustBadges`/`ApiSparkline` mock with real props or remove if purely decorative.
3. Greeting: derive from `useAuth().user.name` and real date in `app/(app)/dashboard/page.tsx` (currently `t.greeting` = "Good morning, Khalid").
**Files:** `app/(app)/dashboard/page.tsx`, `app/api/dashboard/route.ts`, `lib/db/queries.ts`, `components/dashboard/*`.
**Acceptance:** a fresh tenant shows real zeros/empty; numbers equal DB; name is the logged-in user.

### 2.4 Analytics de-mock  ·  Priority: MEDIUM
**Why:** Real KPIs but `dailyBars` and avg-clearance are dummy fallbacks.
**How:** In `lib/db/queries.ts` `getAnalyticsData`, compute daily volume from invoices and drop hardcoded arrays; wire `app/(app)/analytics/page.tsx` to `AsyncBoundary`.
**Files:** `lib/db/queries.ts`, `app/(app)/analytics/page.tsx`.
**Acceptance:** charts reflect real invoices; empty tenant → empty states.

### 2.5 Page-state consistency  ·  Priority: MEDIUM
**Why:** `reports`, `notifications` still use the old `loading` boolean; `audit` should confirm states.
**How:** Refactor `app/(app)/reports/page.tsx`, `app/(app)/notifications/page.tsx`, `app/(app)/audit/page.tsx` to `useAsyncData` + `AsyncBoundary` + `NoCompanyState`. (Forms — `invoices/new`, `credit-notes`, `debit-notes` — are fine as-is; they're not lists.)
**Acceptance:** no bare "Loading…"; error+retry + empty everywhere.

### 2.6 Remove dead mock modules  ·  Priority: LOW (do last)
**Why:** Several `@/data/*` + orphaned components remain after pages were rewritten.
**How:** After 2.3, delete orphaned: `components/clearance/ClearanceFeed|ClearanceStats|SuccessDonut.tsx`, `components/integration/CertificateWidget.tsx`, and the now-unused `data/clearance.ts`, `data/kpis.ts`, `data/feed.ts`, `data/volume.ts`, `data/analytics.ts` **only once nothing imports them** (`grep -rl 'from "@/data/x"'`). Keep `data/nav.ts`, `data/ai.ts` (prompts), `data/services.ts`, `data/company.ts` if still referenced. Update/remove stale tests (`components/clearance/*` referenced by none; `EnvCard.test.tsx`, `InvoiceTable.test.tsx` may import mock fixtures — keep fixtures local).
**Acceptance:** `grep -rl 'from "@/data/clearance"'` etc. returns nothing; build + tests green.

### 2.7 Env validation at boot  ·  Priority: MEDIUM
**Why:** Misconfig should fail fast, not at first request.
**How:** Add `lib/env.ts` with a zod schema for required vars (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`) and optional (`OPENROUTER_API_KEY`, `ZATCA_MODE`). Import once in `lib/db/client.ts` or an instrumentation hook. Warn (not crash) when AI key absent (mock mode is intended).
**Files:** `lib/env.ts` (new).
**Acceptance:** missing `DATABASE_URL`/`AUTH_SECRET` throws a clear startup error.

### 2.8 Accessibility / RTL pass  ·  Priority: MEDIUM
**How:** Keyboard focus rings on interactive elements; `aria-label`s on icon-only buttons (dock, bell — done); ensure Arabic (`dir=rtl`) flips layouts (use logical props `insetInlineStart/End`, `marginInlineStart` — already used in newer components; audit older ones). Test with `lang=ar`.
**Acceptance:** tab-navigable; RTL has no clipped/overlapping UI.

---

## 3. Functional gaps to close

### 3.1 Password reset flow  ·  Priority: HIGH (referenced, not built)
**Why:** Login/Settings mention "Forgot password" but no flow exists.
**How:** `app/forgot/page.tsx` + `app/reset/page.tsx`; `POST /api/auth/forgot` (issue a signed, expiring token — reuse `lib/auth/session.ts` jose), `POST /api/auth/reset` (verify token, set new `passwordHash`). Email delivery is out of scope for sandbox — return/log the link, or store a one-time token. Add `/forgot`,`/reset` to `proxy.ts` allowlist.
**Files:** `app/forgot/`, `app/reset/`, `app/api/auth/forgot/route.ts`, `app/api/auth/reset/route.ts`, `proxy.ts`.
**Acceptance:** request → token → set new password → login works.

### 3.2 Credit / Debit notes — verify + polish  ·  Priority: MEDIUM
**Why:** Built (`components/invoices/NewNoteForm.tsx` → `POST /api/invoices` with `documentType`) but not browser-verified end-to-end.
**How:** Browser test: create a note referencing `INV-2026-12438`; confirm it persists with `documentType=credit|debit` and appears in lists/Audit Vault. Fix the buyer/company single-select UX (now one tenant).
**Acceptance:** a credit note is created, signed, and visible.

### 3.3 Real ZATCA compliance checks  ·  Priority: MEDIUM (needed for real production CSID)
**Why:** `runComplianceChecks` in `lib/services/onboarding-service.ts` is mocked (returns `{success:true}` without submitting sample invoices) — see the `TODO` there.
**How:** Generate the 4 sample documents (standard, simplified, credit, debit), sign with the compliance key, submit via `submitComplianceInvoice` against the sandbox; gate Production CSID issuance on success.
**Files:** `lib/services/onboarding-service.ts`, `lib/zatca/onboarding.ts`, `lib/zatca/client.ts`.
**Acceptance:** sandbox onboarding passes real compliance checks before issuing a production CSID.

### 3.4 ZATCA submission for local cert  ·  Priority: MEDIUM
**Why:** Local dev cert (`provisionLocalCertificate`) can sign but real clearance needs a real CSID. `submitInvoice` will fail against the gateway with a placeholder token.
**How:** In the Compliance Center / submit tool, detect `isLocal` (already exposed by `/api/integration`) and show "connect ZATCA to clear/report" instead of a confusing gateway error. Optionally add a "simulation" submit that marks reported locally for demos.
**Files:** `lib/ai/tools.ts` (`submitInvoice`), `app/(app)/clearance/page.tsx`, `lib/services/clearance-service.ts`.
**Acceptance:** local-cert tenants get a clear message, not a stack trace.

### 3.5 Invoice detail view  ·  Priority: LOW
**Why:** List + PDF exist; a dedicated `/invoices/[id]` view (status, XML, QR, ZATCA response, actions) improves UX.
**Files:** `app/(app)/invoices/[id]/page.tsx` (new), reuse `getInvoice`, `/api/invoices/[id]/pdf`.

---

## 4. AI enhancements

### 4.1 Stream the agent's final answer  ·  Priority: MEDIUM
**Why:** Tool-loop is non-streaming; the dock shows the final message all at once.
**How:** After the tool rounds resolve, do a final streaming completion (`chatStream`) for the natural-language summary; keep tool rounds non-streaming. Or stream only when no tool is needed.
**Files:** `app/api/ai/agent/route.ts`, `components/ai/AssistantDock.tsx`.

### 4.2 Confirm-before-write  ·  Priority: MEDIUM
**Why:** The agent executes writes immediately (e.g. createInvoice). Safer to confirm destructive/financial actions.
**How:** Add a "dry-run/confirm" step: write tools return a proposed action the user confirms in the dock before a second call executes. Or tag tools `confirm: true` and have the route return a pending action.
**Files:** `lib/ai/tools.ts`, `app/api/ai/agent/route.ts`, `components/ai/AssistantDock.tsx`.

### 4.3 Ingest tenant data into the vector store  ·  Priority: MEDIUM
**Why:** RAG currently retrieves global ZATCA chunks only; company-scoped chunks (`scope=company`) are designed but not populated.
**How:** On invoice/customer changes (or a scheduled job), upsert summaries via `upsertChunks([{scope:"company", companyId, source:"invoice", text}])`. Add to `/api/ai/ingest` a company-scoped mode.
**Files:** `lib/ai/vector-store.ts`, `app/api/ai/ingest/route.ts`, hooks in `invoice-service`.
**Acceptance:** "how many invoices did I send to Tamimi?" retrieves tenant context.

### 4.4 Embedding cold-start + pgvector path  ·  Priority: LOW
**Why:** First embed loads the MiniLM model (~5s). Cosine is in-app (fine for a small corpus).
**How:** Warm the pipeline at boot (instrumentation) so first chat isn't slow. For scale, migrate `KnowledgeChunk.embedding` to pgvector (`vector(384)`, Prisma `Unsupported`, raw SQL `<=>` search) behind the existing retrieve interface in `lib/ai/vector-store.ts`.
**Files:** `lib/ai/embeddings.ts`, `lib/ai/vector-store.ts`, `prisma/schema.prisma`.

---

## 5. Admin & business

### 5.1 Custom DB-backed roles  ·  Priority: MEDIUM
**Why:** Phase 5 ships 5 system roles + matrix view; the PRD wants composable custom roles.
**How:** Add `Role` (id, companyId, name, isSystem) + `RolePermission` (role→permission). `User.roleId` alongside `role`. Make `can()` consult DB roles when `roleId` is set (cache per request). Roles tab gains a permission-checkbox builder.
**Files:** `prisma/schema.prisma`, `lib/auth/rbac.ts`, `app/api/roles/*`, `app/(app)/users/page.tsx`.
**Acceptance:** create a custom role from permissions; assign it; it gates API + UI.

### 5.2 Billing  ·  Priority: LOW (post-v1)
**Why:** Monetization (PRD §10). Settings reserves a Billing section.
**How:** Stripe subscriptions: plans by invoice volume/branches/seats; `Subscription` model; webhook route; usage metering. Free sandbox tier default.
**Files:** `app/api/billing/*` (new), `prisma/schema.prisma`, `app/(app)/settings/page.tsx`.

---

## 6. Testing

### 6.1 Unit/integration coverage  ·  Priority: MEDIUM
Add tests as you touch code (TDD). DB tests on the Neon test branch, self-cleaning. Targets without
coverage: dashboard shaping, analytics aggregation, notes flow, password-reset tokens, custom roles.

### 6.2 End-to-end (Playwright)  ·  Priority: HIGH for ship confidence
**How:** Add `e2e/` Playwright specs for the critical journeys: register → onboard → add customer/product → issue invoice → see it in Compliance Center; AI dock command creates an entity; users invite. Use a seeded/throwaway tenant. The browser MCP used for manual verification mirrors these.
**Files:** `e2e/*.spec.ts`, `playwright.config.ts`.
**Acceptance:** `npx playwright test` green on the critical flows.

### 6.3 CI  ·  Priority: MEDIUM
GitHub Actions: `tsc --noEmit`, `vitest run`, `playwright test` (against a preview/Neon branch), lint. Block merge on red.
**Files:** `.github/workflows/ci.yml` (new).

---

## 7. Deployment & production readiness

**Path to ship (Vercel + Neon):**
1. **DB:** enable `pgvector` on Neon if migrating embeddings; run `prisma migrate deploy` against `DIRECT_URL` (switch from `db push` to real migrations for prod — generate an initial migration from the current schema).
2. **Env vars** (platform, NOT files): `DATABASE_URL` (pooled), `DIRECT_URL`, `AUTH_SECRET` (rotate: `openssl rand -base64 48`), `AUTH_ENFORCE=true`, `ZATCA_MODE`, `OPENROUTER_API_KEY`, embedding settings. The `archive/` files never deploy.
3. **Seed:** none in prod (gated by `SEED_DEMO`). First user self-registers.
4. **Build:** `next build`; verify the embeddings model downloads/caches in the serverless env (or pin a warm region / use a hosted embedding to avoid cold start — see 4.4).
5. **Domains/HTTPS**, security headers, rate-limit tuning in `proxy.ts`.
**Acceptance:** clean deploy, register→issue works in prod, no secret in the bundle (`grep` the build output).

---

## 8. Security hardening checklist

- [ ] `AUTH_ENFORCE=true` in prod; rotate `AUTH_SECRET`.
- [ ] Every mutating route zod-validated + `requirePermission` + tenant-scoped (audit `app/api/**`).
- [ ] ZATCA private keys encrypted at rest (`lib/crypto/encrypt.ts`) — verify `ENCRYPTION_KEY` set in prod.
- [ ] CSRF (origin check) + rate limit in `proxy.ts` — tune limits.
- [ ] Session expiry/rotation; `httpOnly`, `secure`, `sameSite` cookies (set in auth routes).
- [ ] No secrets in git: `git check-ignore archive/ .env creds.md`; scan history if ever doubtful.
- [ ] Password reset tokens single-use + short-lived (§3.1).
- [ ] AI tools: confirm RBAC on every tool; no tool exposes cross-tenant data (`companyId` from session only).

---

## 9. Suggested execution order

1. **Phase 6 visible polish:** 2.3 dashboard de-mock → 2.1 theme → 2.2 animations → 2.4/2.5 state consistency → 2.6 cleanup.
2. **Close functional gaps:** 3.1 password reset → 3.2 notes verify → 3.4 local-cert submit message → 3.3 real compliance checks.
3. **AI polish:** 4.1 streaming → 4.2 confirm-before-write → 4.3 tenant ingestion.
4. **Hardening:** 2.7 env validation → §8 security → 5.1 custom roles.
5. **Ship:** 6.2 e2e → 6.3 CI → §7 deploy. (Billing 5.2 after launch.)

Each item: TDD the logic, wire the UI to the established patterns, browser-verify, commit atomically
on `feature/production-readiness`, keep `tsc --noEmit` + `vitest run` green.

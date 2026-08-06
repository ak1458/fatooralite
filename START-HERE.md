# START HERE — Fatoora Lite Pro

**Single entry point for a new session.** Read this file first; it tells you
the current state, what is left, and what must not be broken. Everything else
is detail:

| Document | What it is |
| --- | --- |
| `START-HERE.md` (this file) | Current state and the work queue. Keep it short. |
| `docs/16-launch-plan.md` | The phase plan, with full write-ups of what each phase did. |
| `handoff.md` | Chronological diary, ~1500 lines. Search it; don't read it top to bottom. |
| `CLAUDE.md` | Working agreement: two-agent convention, no tool attribution, progress tracking. |
| `docs/18-production-checklist.md` | **Owner-facing:** blockers, env vars, deploy steps, demo notes. Read this before deploying or demoing. |
| `docs/12-master-roadmap.md` | Original product vision behind the plan. |

---

## What this is

ZATCA Phase-2 e-invoicing SaaS for Saudi businesses. Next.js 16 + Prisma +
Neon Postgres, deployed on Vercel. Multi-tenant, paid-only (7-day trial, then
Pro). The app lives in `fatooralite/` — **that path is the Vercel Root
Directory, do not move or rename it.**

```bash
cd fatooralite
npm install
cp .env.example .env     # then fill it in
npm run db:migrate && SEED_DEMO=true npm run db:seed
npm run dev
```

Demo login after seeding: `khalid@almarai.example` / `owner1234`.

---

## Current state (2026-08-06)

- **Shipped.** `main` is pushed to GitHub and deployed to production. Tagged
  `v0.4.0`; tags `v0.1.0`–`v0.4.0` are all on the remote.
- Live at **https://fatooralite.vercel.app** — verified after deploy: health
  200 with the database connected, unauthenticated `/api/*` returns a JSON
  401, and `robots.txt` / `sw.js` serve (both were proxy-blocked before).
- **Vercel is NOT git-connected.** Pushing to GitHub does *not* deploy.
  Ship with `cd fatooralite && npx vercel --prod`.
- `AUTH_ENFORCE=true`, `ZATCA_MODE=sandbox`.
  **Production still shares the dev Neon database** — separate them before
  real customers exist, or a seed/reset destroys live data.
- Production `AUTH_SECRET` was rotated on 2026-08-06 to a known-good value.
  `vercel env pull` returns empty strings for encrypted vars, so the old one
  could not be read to check it against the placeholder that the new boot
  guard rejects; rotating removed the risk of the guard taking the site down.
  Existing sessions were invalidated by that (harmless — no real users yet).

All five CI gates pass, in the order CI runs them:

```bash
cd fatooralite
npm run lint                       # 0 errors — was failing for a long time; keep it green
npm audit --audit-level=critical
npx vitest run                     # 285 passed / 43 skipped (DB-gated)
npx tsx scripts/validate-zatca.ts  # 7/7 local checks
npm run build
```

> `npm run lint` runs **before** `zatca:validate` and `npm audit` in the same
> CI job. When lint was red, neither of those gates had ever executed. If lint
> goes red again, they go dark with it.

---

## Done

**Phase 1 — codebase organization.** 136 uncommitted files turned into
semantic commits; release/branching/semver conventions written; historical
tags; `commit-msg` hook that blocks AI attribution; the 787-line onboarding
page split into step components; every wizard field labelled through a shared
`Field`; layer boundaries lint-enforced.

**Phase 2 — trial and Pro licensing.** Paid-only. Pure resolver in
`lib/billing/entitlements.ts`, server-side enforcement at five points, 402
bodies that explain themselves, trial banner, plan gates that disable a
control and say why before the click.

**Phase 4 — product audit.** Done by running the app, not reading it. Theme
tokens (74 literals removed, light-mode contrast failures fixed), static/PWA
assets unblocked, 360px layout fixed, accessibility named controls,
performance: every dashboard query cut to one round trip and two that loaded
whole tables replaced with aggregates.

**Phase 5 — security.** Next.js 16.3.0 (nine advisories including an App
Router proxy bypass — this app's auth gate *is* the proxy), licensing surface
retest, 28 adversarial tests on the plan resolver, client-side 401/402
handling.

Five bugs found this run that each made a headline feature unusable, and
**none were visible in source review**:

1. `invoiceTypes` was required by the completion guard but collected by no
   screen — **no new tenant could finish onboarding.**
2. `proxy.ts` gated `/sw.js` — **the service worker had never registered**, and
   crawlers got the login page instead of `robots.txt`.
3. The seeded demo tenant's `onboardingStatus` stayed `pending` — **it could
   never reach the dashboard it exists to demonstrate.**
4. Starting a checkout wrote `plan: "free"`, which resolves to expired —
   **clicking Upgrade could end a live trial.**
5. Four routes returned `error.errors` on a validation failure; zod v4 renamed
   it to `.issues`, so **every 400 arrived with an empty error body.**

Two were found by running the app, two by writing tests that derived their
expectations from the schema rather than from the code under test, one by
clearing an `any` cast. Prefer both over another reading pass.

---

## What is left

### 1. Phase 7 — market research *(do this next)*

Deliverable `docs/17-market-analysis.md`. ZATCA-adjacent vendors (Wafeq,
Qoyod, Zoho Books KSA, Odoo partners, Mudad, ClearTax KSA, Sada), their
pricing and tiers, what their users complain about, mapped against this
product. **It gates pricing:** `PRO_PRICE_HALALAS` is a 149 SAR placeholder
and should be settled before checkout goes live. The tier *boundaries* are one
table in `entitlements.ts` and cheap to move; the price is the researched part.

### 2. Phase 3 — AI assistant depth

- **Server-minted confirmation tokens.** `confirmedAction` in
  `app/api/ai/agent/route.ts` is a client-trusted flag: the client resends
  `{name, arguments}` and the server executes it, with nothing binding that to
  what the model proposed and a human saw. RBAC is still the real boundary
  underneath, so this is defence-in-depth — but it is the difference between a
  demo and a product that executes financial actions. Mint a short-lived,
  single-use record keyed to `{userId, companyId, tool, argsHash}`.
- **Widen the tool registry** (11 tools today): update/void invoice, update
  customer and product, onboarding status, report period, compliance
  deadlines. Each needs a schema, zod validator, RBAC permission, confirm
  summary if it writes, and a test.
- **Verify tool calling end to end on Groq** once `GROQ_API_KEY` is set —
  a scripted conversation that actually fires the tools, asserting they ran
  rather than that the model said it ran.

### 3. Phase 5 leftovers — security

- **No audit trail outside invoices.** `AuditEntry` always requires an
  `invoiceId`, so there is no record of failed logins, permission denials,
  password resets, role changes, or certificate issuance. For compliance
  software that cannot answer "who did what, when", this is a real gap.
- **`branchId` scoping (PRD FR5).** The branch selector persists a choice and
  `Invoice.branchId` is stored, but no API route filters by it.
- **Rate limiter trusts `X-Forwarded-For`** with no trusted-proxy validation.
  Fine on Vercel, a real problem for self-hosting — which Phase 8 encourages.
- **Two dependency advisories with no fix at any version**: `adm-zip` and
  `sharp`, reachable only via `@huggingface/transformers` (the optional local
  embedding provider). This is why CI's audit gate is at `critical`, not
  `high`. Raise it if that provider is dropped.

### 4. Phase 8 — simplified deployment

Rewrite `docs/09-deployment.md` as one linear path (Vercel + Neon), everything
else in an appendix. Add `scripts/preflight.ts` validating a `.env` before
first boot with the exact fix for each failure. One-click deploy button.

### 5. Phase 9 — multi-customer provisioning *(needs a plan first)*

Architecture is already multi-tenant, so onboarding a customer should be
self-service, not a new deployment. Missing: an unbroken signup → trial →
wizard → productive path walked by someone who has not seen the product; a
platform-admin surface (**a genuine security decision** — there is deliberately
no platform-admin role today, and three IDOR fixes depend on every role being
tenant-scoped); tenant lifecycle (suspend, resume, export-all, delete);
onboarding telemetry.

### 6. Phase 6 — rename completion *(cosmetic, whenever)*

GitHub description/topics/social preview, Vercel project display name. The
repo slug, npm name and `fatooralite/` directory stay — they are technical
identifiers deployment depends on.

### Smaller, not phase-sized

- Four entitlement flags — `bulkImport`, `apiKeys`, `customBranding`,
  `advancedReports` — are declared and enforced with **nothing behind them**.
  Honest placeholders; do not put them in marketing copy.
- No e2e test proves a trial tenant is refused the 26th invoice through the
  real UI, or that an expired tenant can still export.
- Bundle size per route was never reviewed.

---

## Blocked on the owner, not on engineering

1. **A Fatoora portal OTP** for a real sandbox → production ZATCA round trip.
   The signing fixes (C14N-11 ancestor namespaces, VAT aggregation) are
   high-confidence but **not gateway-certified** until this runs.
2. **A Moyasar merchant account** (KYC + bank). The integration is complete and
   inert; one sandbox transaction is needed to confirm the real webhook payload
   matches `parseInvoiceWebhook`.
3. **Reviewed legal copy** — `/terms`, `/privacy`, `/refund-policy`,
   `/cancellation-policy`, `/data-retention`, `/acceptable-use` all carry DRAFT
   banners with bracketed placeholders.
4. **Final Pro pricing** (see Phase 7).
5. **Branch protection on `main`** — confirmed unset.
6. **`GROQ_API_KEY`** if the Groq demo path is wanted; it ships inert without it.

---

## Invariants — do not "fix" these

Each of these looks like a bug and is deliberate. Changing one is a
regression, and the reason is in the code comment beside it.

- **Clearance and reporting are never plan-gated.**
  `POST /api/invoices/:id/clear` runs for an expired trial. The invoice is
  already issued and ZATCA requires simplified invoices to be reported within
  24 hours; gating it turns a billing state into a regulatory violation.
- **An expired trial is read-only, not locked out.** Viewing, downloading and
  exporting existing invoices and audit records stays available. Withholding a
  tenant's own filed documents behind a paywall is a liability.
- **The UI plan gate fails OPEN.** An unknown or failed plan read allows the
  action. The server returns 402 if the tenant is genuinely over; failing
  closed would lock a paying customer out over one dropped request.
- **A missing `Subscription` row resolves to `expired`, not `trial`** — so a
  deleted row cannot silently re-grant a trial. This is why the trial migration
  had to backfill a row for every existing company.
- **`AUTH_ENFORCE` is secure-by-default** (`!== "false"`), in all six call
  sites. It was once `=== "true"` in three of them, which left API routes open
  while pages redirected correctly.
- **`ENCRYPTION_KEY` must never be regenerated** independently of the database
  it is paired with — stored ZATCA private keys are only decryptable with the
  exact key that encrypted them. Its only reliable copy is the local `.env`;
  `vercel env pull` does not reliably return `--sensitive` values.
- **No AI attribution anywhere in the repo** — no `Co-Authored-By`, no
  "Generated with", no robot sign-offs. Enforced by `.githooks/commit-msg`;
  enable with `git config core.hooksPath .githooks`.

---

## Practical gotchas

- **Screenshots taken before a fetch settles look like bugs.** An "empty"
  settings form and a "Trial" badge on a Pro tenant were both mid-load.
- **Full-page captures of fixed elements look clipped.** The sidebar is fine.
- **`git status` after every commit.** Path-scoped `git add` lists have twice
  missed files in this repo (`lib/hooks/` most recently). Prefer `git add -A`
  with a reviewed diff.
- **Parallel agents on a shared tree need `isolation: "worktree"`**, created
  from a branch that has the current work **committed** — a stale worktree and
  a repo-wide `git stash` have each cost a recovery session here.
- **Windows secrets:** `tr -d '\r\n'`, not `tr -d '\n'`, or a trailing `\r`
  silently corrupts the value.
- **Performance work needs volume.** `scripts/seed-volume.ts` creates and
  removes a synthetic tenant; `scripts/bench-queries.ts` and
  `scripts/bench-shape.ts` measure it. Timings against the 2-invoice demo
  fixture mean nothing.

---

## When you finish a piece of work

1. Run all five gates above.
2. Update `docs/16-launch-plan.md` (phase status) and `handoff.md` (what you
   did, what you deliberately did not, and why).
3. Update this file's **Current state** and **What is left**.
4. Commit with a real message — no tool attribution.

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

## Current state (2026-08-18)

- **A full production audit was run on 2026-08-18** against both audit
  specifications (1069 items). Report and ledger in `docs/audit/`. Verdict:
  **NOT READY**. One of its two blockers is now fixed (Arabic invoice PDFs);
  the other — no ZATCA round trip has ever been performed — is owner-blocked
  on a Fatoora portal OTP.
- **Remediation Phase 1 is complete** (W1 Arabic PDF, W2 security audit trail).
  **Remediation Phase 2 is complete** (W3 idempotency/reconciliation, W4
  observability, W5 AI confirmation tokens, W6 RAG restriction/AI usage
  accounting, W7 deployment config, W26 remaining risks).
  **Remediation Phase 3 is complete, with honestly-documented PARTIALs**
  (W8–W18, N8; F-A/F-B/F-C investigated and closed).
  **Remediation Phase 4 is complete, with honestly-documented PARTIALs**
  (W19, W21–W24 DONE outright; W20, W25 PARTIAL — W20 is a bounded doc
  reconciliation, not exhaustive; W25's drill wasn't run end-to-end, no
  postgres client tools on this machine, checked not assumed). Programme
  state lives in `docs/audit/remediation-ledger.md`; read that before
  starting anything. Phase 5 has NOT been started. Full regression (76 test
  files, 519 tests) confirmed 0 failed / 0 skipped. **If you're picking this
  up fresh, read `docs/SESSION_HANDOFF_2026-08-18.md` first** for the exact
  current state and what to do if this work isn't committed yet.
- **Thirteen defects were found and fixed in the original audit**, four
  financial or compliance-affecting. Full detail in
  `docs/audit/2026-08-18-findings.md`.
- **The test suite now runs its database-gated half.** It was 285 passed /
  43 skipped; after the audit it was 363 passed / 0 skipped, after
  remediation Phase 1 it was 402 passed / 0 skipped, after remediation
  Phase 2 it was 447 passed / 2 pre-existing failed / 0 skipped, after
  remediation Phase 3 it was 497 passed / 0 failed / 0 skipped (73 files),
  and after remediation Phase 4 it is **519 passed / 0 failed / 0 skipped**
  (76 test files — 3 added this phase — run against `fatoora_audit` via
  `TEST_DATABASE_URL`). Run convention unchanged from Phase 3: 6 files that
  call `pushTestSchema()` must run in separate `vitest run` invocations, one
  at a time (running two together races); the other 70 must run together in
  one invocation with `--no-file-parallelism` (true parallel execution
  against the same database caused real connection contention, not a code
  bug). See `handoff.md`'s Phase 3 and Phase 4 entries for the full
  mechanics.
- Security core verified adversarially: 25 cross-tenant attacks refused,
  privilege escalation refused, invoice totals recomputed server-side, the
  ZATCA chain did not fork under concurrency, RAG leaked nothing under prompt
  injection. Evidence in the audit report, not inferred from reading code.

## Previous state (2026-08-06)

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
npx vitest run                     # 447 passed / 2 pre-existing unrelated failures / 0 skipped with TEST_DATABASE_URL set
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

### 0. Remediation programme *(see `docs/audit/remediation-ledger.md` — start there)*

**Phase 1 is done.** Arabic invoice PDFs now render (embedded Amiri + fontkit
shaping + a bidi pass), and a real security/actor audit trail exists with a
query API. Suite: 402 passed, 0 skipped. Ledger: 481 GREEN / 1069.

**Phase 2 is done.** W3 idempotency + ZATCA submission reconciliation + retry
policy (atomic CAS claim, backoff ladder, `/api/cron/zatca-reconcile`), W4
observability (`lib/log/logger.ts`, `x-request-id` correlation, `/api/health/
deep`), W5 server-minted AI confirmation tokens (`AiConfirmation`), W6 global
RAG re-index restricted to `OPERATOR_SECRET` + AI usage accounting
(`AiUsage`), W7 deployment config correctness (`APP_URL` boot check,
`appUrl()` reset links), W26 closed the remaining RISK findings (F-16
reconfirmed as no-longer-reproducing; F-12 confirmed accepted-with-basis at
the time — **since fixed outright in Phase 4/W21, see below**).
Suite: 447 passed / 2 pre-existing unrelated failures / 0 skipped. Ledger:
507 GREEN / 1069. Full write-up in `handoff.md`'s 2026-08-18 Phase 2 entry.

**Phase 3 is done, with honestly-documented PARTIALs.** W8 background job
substrate, W9 Asia/Riyadh timezone policy, W10 branchId scoping, W11 DB CHECK
constraints, W13 migration safety drills, W18 assistant scope claims are
DONE outright. W12 (ZATCA XSD/Schematron validation), W14 (performance
testing), W15 (test coverage), W17 (DevOps staging/patch process), and N8
(credit/debit notes, promoted from Phase 5) are PARTIAL — each gap is either
owner-blocked (X1, X2) or a deliberately undecided business rule (D9), never
silently substituted. W16 (failure-injection harness) is DONE for the
harness itself. F-A/F-B/F-C (carried over from Phase 2's own report) are
closed. Full detail: `docs/audit/remediation-ledger.md`'s Phase 3 table and
outcome section, `handoff.md`'s Phase 3 entry.

**Phase 4 is done, with honestly-documented PARTIALs.** W19 (session
refresh/rotation), W21 (Origin required on state-changing requests, closes
F-12), W22 (sequence-gap surfacing + Arabic search/sort validation), W23
(incident-response runbook), W24 (dependency advisories re-checked, no fix
exists, no change made) are DONE outright. W20 (documentation
reconciliation) and W25 (backup procedures beyond the drill) are PARTIAL —
W20 was a bounded pass against 21 named items, not exhaustive; W25
delivered a working backup/restore procedure and verification script but
the actual drill wasn't run end to end (no postgres client tools on this
machine) and Neon's own PITR/backup capability stays owner-blocked (X2).
Full detail: `docs/audit/remediation-ledger.md`'s Phase 4 table and outcome
section, `handoff.md`'s Phase 4 entry, `docs/SESSION_HANDOFF_
2026-08-18.md`. **Phase 5 has not been started.**

**Three decisions are still open and block work:** D1 (VAT-return scope), D7
(does the absent Control Center gate launch), D8 (is WhatsApp launch scope).
All three are analysed with recommendations in
`docs/audit/decision-register.md`; none has been implemented.

Still outstanding from the audit:

1. ~~**Arabic invoice PDFs fail outright.**~~ **FIXED in Phase 1 (W1).** What
   remains is a *mirrored* RTL page layout (A-189/A-190/A-191) — Arabic text
   renders correctly, but the invoice page is still laid out left-to-right.
   That is a design change, not a rendering fix.

<details><summary>Original Phase 1 blocker text (for history)</summary>

1. **Arabic invoice PDFs fail outright.** `WinAnsi cannot encode "ش" (0x0634)`.
   English invoices render; any Arabic or mixed-script buyer name returns 500.
   The invoice is already signed and numbered by then, so the tenant holds a
   filed document they cannot print or send. Needs an embedded Unicode font
   *and* a shaping engine — pdf-lib does no Arabic shaping — realistically an
   HTML→PDF pipeline. Do not "fix" it by substituting placeholder characters;
   silently altering a name on a tax document is worse than failing.
2. ~~**No security audit trail.**~~ **FIXED in Phase 1 (W2)** — see
   `docs/audit/security-event-log.md`.

</details>
3. ~~**No observability.**~~ **FIXED in Phase 2 (W4).** Structured logging,
   request correlation IDs, `/api/health/deep`. No external error-tracking
   SaaS (Sentry/log-drain) or metrics dashboard — those are owner decisions,
   documented in `docs/18-production-checklist.md`, not engineering defaults.
4. ~~**No AI usage accounting, any tenant owner can trigger a global RAG
   re-index.**~~ **FIXED in Phase 2 (W6).** Global re-index needs
   `OPERATOR_SECRET`; per-call token/latency accounting in `AiUsage`. No
   quota *enforcement* yet — W6 built the accounting substrate, not limits.
5. **HUMAN DECISION:** `/api/reports` counts only `cleared`/`reported` invoices,
   so an issued-but-not-yet-cleared invoice is absent from the VAT return. That
   is a tax-scope call, deliberately left unchanged.

### 1. Phase 7 — market research

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
- **Invoice PDFs draw text run by run, not in one `drawText` call.** fontkit
  applies a single direction to whatever string it is given, so a mixed
  "Acme شركة" leaves the Arabic in logical order and "شركة Acme" reverses the
  Latin. `lib/pdf/bidi.ts` splits the string into single-direction runs and
  `generate.ts` places them; collapsing that back into one call silently
  corrupts every mixed-script invoice. Latin keeps Helvetica and Arabic uses the
  embedded Amiri, so English output is unchanged.
- **`assets/fonts/*.ttf` must stay in `outputFileTracingIncludes`.** The font is
  read at runtime via `process.cwd()`, which Next's tracer cannot see. Drop the
  entry in `next.config.ts` and Arabic PDFs work locally and fail in production.
- **`SecurityEvent` has no foreign keys, deliberately.** An audit record must
  outlive what it describes — the record of a user being deleted cannot be
  cascaded away by that deletion. Nothing purges it either; retention is an open
  decision (`docs/audit/decision-register.md`), and it is safer to keep too much
  than to delete early.
- **Recording a security event must never break the request it describes.**
  `recordSecurityEvent` swallows its own failures on purpose, and `redact()`
  drops sensitive-looking keys rather than trusting call sites. Do not "improve"
  either by letting errors propagate.
- **Logging out signs the user out on every device.** `POST /api/auth/logout`
  increments `User.sessionVersion`. The JWT carries no per-session id, so
  per-device logout is not possible without a schema change; for software
  holding a business's tax records, "signed out means signed out everywhere" is
  the safer default. Clearing the cookie alone was not a logout at all — the
  token stayed valid for its full 7 days.
- **`/api/reports` filters on `issueDate`, not `createdAt`.** The VAT period is
  decided by the tax point, not by when the row was written, and `issueDate` is
  a `YYYY-MM-DD` string so the comparison is timezone-free. Using `createdAt`
  with `new Date(y, m, 1)` boundaries put invoices in the wrong month and made
  the answer depend on the server's timezone.
- **The rate limiter reads `X-Forwarded-For` from the RIGHT.** The caller writes
  that header, so the leftmost entry is attacker-chosen; only entries appended
  by our own edge can be trusted. `TRUSTED_PROXY_HOPS` (default 1) is correct on
  Vercel. Reading it left-to-right, or using the whole header as the key, means
  a fresh value per request is a fresh bucket per request.
- **`Certificate.secret` is encrypted at rest, and legacy clear-text rows are
  returned unchanged.** `decryptSecret` distinguishes them by shape, so no
  migration was needed. Do not "simplify" that passthrough away.
- **`submitInvoice` writes status `submitted` before calling ZATCA.** That state
  existed in the schema and was read by the UI but never written, so a crash
  after ZATCA accepted looked identical to never having sent. An invoice in
  `submitted` means "fate unknown, needs reconciling" — it is not a bug. Since
  Phase 2 (W3) that write is an atomic compare-and-swap
  (`updateMany({ where: { status: { in: ["signed","rejected"] } } } })`), not
  a plain update — this is what makes concurrent/retried submissions safe.
  Do not revert it to a read-then-write.
- **`Invoice.needsReview = true` with `status` still `submitted` is a
  deliberate terminal state, never auto-resolved.** It means the retry
  ceiling (`MAX_SUBMIT_ATTEMPTS`, `lib/services/clearance-service.ts`) was
  hit without ever receiving a gateway response. ZATCA has no status-lookup
  endpoint, so the system cannot know whether that document was actually
  accepted — only a human decision (resend manually, or mark abandoned) may
  change it. Do not build a job that clears this flag automatically.
- **A `rejected` invoice can still be resubmitted; only `cleared`/`reported`
  are terminal.** The CAS claim's `WHERE status IN ('signed','rejected')` is
  intentional — a gateway rejection can be transient or credential-related,
  and refusing resubmission there would leave no correction path.
- **AI confirmation tokens are consumed atomically, and the executed
  tool/arguments come from the stored `AiConfirmation` row, never from the
  client's copy — even when they'd match.** (`lib/ai/confirmation.ts`,
  Phase 2 / W5.) The whole point is that nothing the client sends can
  determine what a confirmed action executes. Do not "simplify" the
  confirm route back to trusting `{name, arguments}` from the request body.
- **`OPERATOR_SECRET` unset means global AI re-index is fully disabled over
  HTTP** (`POST /api/ai/ingest {scope:"global"}` → 403), by design — not a
  misconfiguration to work around by defaulting it open. There is
  deliberately no platform-admin role in this app. Rebuild the shared corpus
  at deploy time with `scripts/ingest-global.ts` instead.
- **`x-request-id` is minted server-side in `proxy.ts`
  (`crypto.randomUUID()`) and never read from an inbound header.** A client
  that sends its own `x-request-id` is ignored — trusting a client-supplied
  correlation id would let a caller plant an arbitrary value into every log
  line describing its own request.
- **Schema operations (`prisma db push`, `migrate dev`, `migrate deploy`)
  must use the DIRECT (non-pooled) Neon connection URL, never the pooled
  (pgbouncer) one.** Pgbouncer's transaction-pooling mode doesn't reliably
  support the session-level features (advisory locks, prepared statements)
  schema DDL depends on — using the pooled URL produces intermittent
  advisory-lock-timeout and "table does not exist" failures that look
  unrelated to the real cause. The app's own runtime queries are fine
  against the pooled URL; this only applies to schema-mutating commands.
  Phase 3 / W13 (`docs/19-operations-runbook.md` §3).
- **`prisma db push --force-reset` (what every DB-gated test file's
  `pushTestSchema()` calls) refuses to run when Prisma detects it's being
  invoked by an AI agent, without `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`
  set to a human's own verbatim consent text.** This is a real Prisma CLI
  safety feature, not a bug to route around — and Claude Code's own
  permission classifier separately blocks an agent from setting that env var
  itself, or from editing its own `settings.json` to self-grant a bypass.
  Only 6 test files call `pushTestSchema()`
  (`lib/ai/vector-store.test.ts`, `lib/auth/server.test.ts`,
  `lib/billing/plan.test.ts`, `lib/db/repo.test.ts`,
  `lib/services/clearance-service.test.ts`,
  `lib/services/invoice-service.test.ts`); each needs its own separate
  `vitest run` invocation (two together race). See `handoff.md`'s Phase 3
  entry for what actually worked.
- **The Origin/Referer requirement in `proxy.ts` (W21) only fires when the
  session cookie is present on the request.** A cookie-less state-changing
  request (cron's bearer secret, Moyasar's webhook token, a bare API client
  that 401s downstream anyway) is deliberately exempt — the point is to
  refuse a *cookie-authed* request with no Origin/Referer (the F-12 shape),
  not to demand Origin on every non-GET request regardless of auth. Do not
  "harden" this to apply unconditionally; that would break every
  cookie-less machine caller this app already relies on.
- **`GET /api/auth/me`'s session refresh (W19) only runs after
  `hasCurrentSessionVersion` passes, never before or in parallel.**
  Revocation must always dominate refresh — a token whose `sessionVersion`
  is stale gets no refresh at all, only rejection. Do not reorder these two
  checks or make the refresh "best-effort in parallel" with the revocation
  check; that would let a revoked session extend itself.

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

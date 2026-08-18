# Launch Plan — Fatoora Lite Pro

Sequenced plan for the remaining pre-launch work. Written 2026-08-04 against
commit `967807b` on `feature/production-readiness`.

`handoff.md` remains the progress tracker — this document is the *order of
operations* behind it. Per [CLAUDE.md](../CLAUDE.md), invoke the `architect`
agent to produce a detailed `docs/plans/<date>-<phase>.md` before starting any
phase marked **needs a detailed plan**.

---

## Current state

| Area | State |
| --- | --- |
| ZATCA Phase-2 engine | Real. Signing, canonicalization, PIH chain, QR, clearance and reporting all implemented and unit-tested. **Never round-tripped against a live gateway.** |
| Auth / RBAC / tenancy | Real. Five roles, deny-by-default tenant scoping via one `isCallerCompany` chokepoint, session versioning enforced. |
| Onboarding | Six-step guided wizard, single-call ZATCA activation endpoint. |
| Billing | Moyasar hosted checkout + verified webhook, built and inert (no merchant keys). |
| AI | Provider-agnostic (OpenRouter / Groq / Anthropic / OpenAI). Tool calling **already works** — 11 tools, RBAC-checked, confirm-gated. |
| Deployment | Live at `fatooralite.vercel.app`, `AUTH_ENFORCE=true`, `ZATCA_MODE=sandbox`. |
| Licensing | 7-day trial / Pro, enforced server-side at five points. No free tier. |
| Tests | 280 passing / 43 skipped (DB-gated), `tsc` clean, `lint` 0, `zatca:validate` 7/7. |
| Repo | 31 semantic commits, `v0.1.0`–`v0.3.0` tagged, release policy documented, attribution guard installed, stale branches cleaned. |

### Blocked on the owner, not on engineering

These gate launch and no amount of code closes them:

1. **A Fatoora portal OTP** for a real sandbox → production ZATCA round trip.
   Until this runs, the signing fixes are high-confidence but not certified.
2. **A Moyasar merchant account** (KYC + bank details). The integration is
   complete; one sandbox transaction is needed to confirm the webhook payload
   shape matches `parseInvoiceWebhook`.
3. **Reviewed legal copy** for `/terms`, `/privacy`, `/refund-policy`,
   `/cancellation-policy`, `/data-retention`, `/acceptable-use`. All currently
   carry DRAFT banners with bracketed placeholders.
4. **Final Pro pricing.** `PRO_PRICE_HALALAS` is a 149 SAR placeholder.
5. **Branch protection on `main`** — confirmed unset via `gh api`.

---

## Phase 1 — Codebase organization ✅ complete

Commits `2399c06`…`8747d80`. Test count 143 → 184; `tsc` clean, build green,
`zatca:validate` 7/7, lint 20 → 18 problems (all pre-existing, none in the
touched modules, zero `jsx-a11y`).

**Repository and release hygiene.** 136 uncommitted files became 15 semantic
commits; `.claude/worktrees/` ignored and the eight stale worktree branches
plus `audit-snapshot` deleted (all pointed at one orphan commit whose LICENSE
change the current file already supersedes); loose plan documents consolidated
into `docs/plans/`; `CONTRIBUTING.md` rewritten (it described a `doc/` folder
that does not exist and a mock-data directory deleted during de-mocking);
branching, commit, semver, release and milestone conventions written;
`v0.1.0`–`v0.3.0` tagged; `.githooks/commit-msg` blocks assistant attribution.

**Task 1.1 — split the wizard.** `app/onboarding/page.tsx` was 787 lines, by a
wide margin the largest source file in the repository, holding six step
components, the wizard chrome, the validators and the routing. Now 232 lines
of routing, state and step dispatch, with steps under
`components/onboarding/steps/` and shared pieces in `Field`, `StepNav`,
`WizardChrome`, `styles` and `types`. Largest new file is 320 lines.

**Task 1.2 — accessibility.** Rather than patching ~30 fields individually,
every field renders through `components/onboarding/Field`, which owns the
`htmlFor`/`id` association, the required marker (`aria-required`, kept out of
the accessible name), the error (`role="alert"` + `aria-invalid` +
`aria-describedby`) and the hint. A field cannot be added without it. The
stepper is an ordered list with `aria-current="step"` and text equivalents for
state that colour alone carried; ZATCA activation progress is announced via
`role="status"`. Covered by 19 component tests, including a per-step assertion
that every control has an accessible name.

**Task 1.3 — layer boundaries.** Four `no-restricted-imports` blocks in
`eslint.config.mjs` enforce `lib/zatca` → `lib/db` → `lib/services` →
`app/api` → UI. Built on the rule ESLint ships rather than adding
`eslint-plugin-boundaries`. Existing code was already clean; the rules were
proved non-vacuous with a temporary probe file.

### Blocker found and fixed along the way

`invoiceTypes` is required by `zatcaMandatoryCompanySchema`, and therefore by
the server-side guard on `PATCH /api/companies/[id]`, but it was collected by
no wizard step, no registration field and no settings screen. A fresh tenant
could complete all six steps and be refused at "Go to dashboard" with a 422
naming a field no screen exposes — **onboarding was impossible to finish for
anyone except the seeded demo company**, which sets the value directly, which
is why every prior audit and the e2e suite missed it.

Now collected in the Tax Registration step. `lib/onboarding/steps.test.ts`
derives the required-field list from the schema rather than hand-listing it,
so adding a mandatory field without a step to collect it fails a test instead
of a customer.

Two related defects fixed in the same pass:

- Step validators returned a bare message and the caller derived the field key
  with `message.split(" ")[0]`, which only worked while a message began with
  its own field name. "Postal code is 5 digits" keyed to `Postal` and "Enter a
  valid email" keyed to `Enter`, so those errors rendered nowhere and Continue
  silently did nothing. Validators now return `{field, message}`.
- Business category, CR type and CR issue date carried a required marker the
  validator did not enforce, so the step advanced with them empty and the
  failure surfaced later at the completion guard. CR issue place carried the
  marker but is not in the mandatory schema, so the marker was removed rather
  than a rule invented.

Per-step schema slices (`businessIdentityStepSchema`, `taxRegistrationStepSchema`,
`addressContactStepSchema`) are built from the same field definitions the
completion guard uses, so a rule can never be stricter in one place than the
other.

---

## Phase 2 — Trial and Pro licensing ✅ complete

Commit `448634e`. Paid-only: a tenant is in a 7-day trial, on Pro, or expired.
No free tier.

| | Trial (7 days) | Pro |
| --- | --- | --- |
| ZATCA sign / clear / report / QR / PDF | yes | yes |
| Invoices per month | 25 | unlimited |
| Branches | 1 | unlimited |
| Seats | 2 | unlimited |
| AI assistant, read-only tools | yes | yes |
| AI write actions | no | yes |
| Bulk import / export | no | yes |
| API keys | no | yes |
| Custom invoice branding | no | yes |
| Advanced reports | no | yes |

**Where the logic lives.** `lib/billing/entitlements.ts` is pure — `resolvePlan`,
`hasFeature`, the limit table, the trial arithmetic — so all 37 of its cases run
without a database. `lib/billing/plan.ts` reads rows and counts on top of it.
Resolution is conservative in both directions: a lapsed payment, a cancelled
row, an unrecognised plan name and a missing row all resolve to `expired`.

**Enforcement**, all server-side, all returning a 402 with
`{reason, plan, feature, limit, used, upgradeUrl}`: `POST /api/invoices`
(entitlement + monthly cap), `POST /api/branches`, `POST /api/users`, and
`executeTool` in `lib/ai/tools.ts`. Chat is not a side door around licensing.

**Two deliberate exemptions**, both documented in the code:

- An expired trial is **read-only, not locked out**. Viewing, downloading and
  exporting existing invoices and audit records stays available.
- Clearance and reporting (`POST /api/invoices/:id/clear`) is **not gated**. An
  invoice reaching it has already been issued, and ZATCA requires a simplified
  invoice to be reported within 24 hours. Blocking that on an expired trial
  would leave a tenant holding invoices it is legally required to file and
  cannot — turning a billing state into a regulatory violation.

**The migration mattered more than the column.** The database held 61 companies
and zero subscription rows; since a missing row resolves to `expired`, every one
would have been locked out of issuing on deploy.
`20260804180703_subscription_trial` converts former free rows and backfills a
trial row for every company without one. Verified after applying: 61 companies,
61 trial rows, no orphans, no null trial-end dates. Registration now starts the
trial inside the company-creation transaction, so the state cannot recur.

**UI.** A trial strip above page content that escalates rather than nags — muted
early, warmer at three days, dismissible for a day at a time, non-dismissible
only once the trial has ended. Settings → Billing shows the resolved plan, days
remaining, usage against all three limits, and the full Pro feature list. Pro
capabilities are listed, never hidden.

**Per-control affordances ✅** (commit `04c4bc0`). Plan and usage live in the
session context, fetched in a round trip it already made, so every consumer
shares one read. `checkLimit()` in `entitlements.ts` is the pure predicate,
used by both `usePlan()` and its tests rather than reimplemented in either.
`PlanGate` renders the decision via a render prop so call sites keep their own
styling. At the invoice cap the create action becomes a real disabled
`<button>`, not a `Link` styled to look dead — the latter is still followable
by keyboard and by URL. **It fails open by design:** an unknown or failed plan
read allows the action, because the server returns 402 anyway and failing
closed would lock a paying customer out over one dropped request.

**Client-side 402/401 handling ✅** (commit `619e5fc`) — one `window.fetch`
wrapper covering all ~63 call sites.

### Still open in this phase

- **Four gated features do not exist yet.** `bulkImport`, `apiKeys`,
  `customBranding` and `advancedReports` are declared and enforced, but there is
  nothing behind them to unlock. They are honest placeholders in the entitlement
  table, not shipped capabilities — do not list them in marketing copy until
  they are built.
- **E2E coverage.** The unit and DB-backed tests cover resolution and the gates;
  no end-to-end test yet proves a trial tenant is refused the 26th invoice
  through the real UI, or that an expired tenant can still export.
- **Pricing is still a placeholder** (`PRO_PRICE_HALALAS` = 149 SAR). Phase 7.

---

## Phase 3 — AI assistant depth

Groq is wired (this session) and tool calling already works. What remains:

### Task 3.1 — Server-minted confirmation tokens

The one real architectural gap in the agent. `confirmedAction` is a
client-trusted flag: the client resends `{name, arguments}` and the server
executes it, with nothing binding that payload to something the model actually
proposed and a human actually saw. RBAC is still the authorization boundary
underneath, so this is defense-in-depth rather than an open hole — but it is
the difference between a demo and a product that executes financial actions.

Mint a short-lived, single-use pending-action record server-side keyed to
`{userId, companyId, tool, argsHash}`; the confirm round trip names the token
and carries no payload.

### Task 3.2 — Widen the tool registry

Eleven tools today. The stated goal is "perform actions directly from chat
rather than navigating screens", so the gaps that matter are: update/void an
invoice, update customer and product, run the onboarding status check, fetch a
specific report period, and check compliance deadlines. Each needs a schema, a
zod validator, an RBAC permission, a confirm summary if it writes, and a test
in `lib/ai/tools.test.ts`.

### Task 3.3 — Verify tool calling end to end on Groq

Once `GROQ_API_KEY` is set: a scripted conversation that creates a customer,
creates an invoice, submits it, and reads back compliance stats — asserting
the tools actually fired rather than that the model described firing them.
Model choice must support tool calling; verify before demoing.

---

## Phase 4 — Full product audit ✅ complete

Done in a real browser against a production build, signed in as the demo
tenant, at 1440 and 360 in both themes — commit `8cc51b2`. Running the app
found things source review had missed five times: seven public legal pages
failing AA contrast in light mode only, a service worker that had never
registered because `proxy.ts` gated `/sw.js`, `robots.txt` and `sitemap.xml`
served as the login page to crawlers, a demo tenant that could not reach its
own dashboard, and a profile menu clipped off-screen and unclickable at
360px. Details in `handoff.md`.

**Visual consistency ✅** — 74 colour literals replaced with tokens, five new
tokens for foregrounds that must flip with the theme, and
`app/theme-tokens.test.ts` holding the count at zero.
**Responsive ✅** — no document overflow at 360px on any route; the two
elements that exceed the viewport are the decorative glow gradients
(`pointer-events: none`).
**Broken flows and edge cases ✅** — the console is clean, the auth gate holds,
and the demo fixture works end to end.

**Accessibility ✅** (commit `4b2c7fc`) — driven with a keyboard and by
computing accessible names in the page. One real finding: the invoice and
credit/debit note line-item fields had a placeholder and no label, so a screen
reader announced the product's core workflow as a row of unnamed edit boxes.
`jsx-a11y` does not catch that — its rules cover labels that exist, not
controls with none. Otherwise clean: 0 unnamed controls across the pages
checked, the modal is a labelled `role="dialog"` with `aria-modal`, the skip
link is the first Tab stop and focus rings are visible.

**Performance ✅** (commit `1812ce8`) — measured against a synthetic
20,000-invoice tenant, because timings against the 2-invoice demo fixture are
meaningless. Prior audits recorded "no N+1 patterns", which was true and not
the problem. Four queries awaited independent work in sequence against a
remote database, and two loaded whole tables into Node to render a handful of
numbers:

| | before | after | |
| --- | --- | --- | --- |
| `getDashboardKpis` | 6086 ms | 1463 ms | 4.2× |
| `getAnalyticsData` | 4336 ms | 1495 ms | 2.9×, 20,000 → ~25 rows |
| `getInvoiceList` | 3199 ms | 1760 ms | 1.8× |
| `getDashboardIntegration` | 2982 ms | 1402 ms | 2.1× |
| `getDashboardVolume` | 1907 ms | 1603 ms | 329 → 13 rows |

Every page query now sits at the single-round-trip floor (~1.45 s here, which
is network latency to Neon, not the query). No index was added — each
individual query already measured within ~100 ms of a `SELECT 1` baseline, so
there was no evidence of index starvation and adding one would have been
guessing. The new aggregates were checked against the in-memory implementation
they replaced on the same 20,000 rows: total, cleared, rejected, VAT, distinct
customers, the pending derivation and the top-5 revenue ranking including
order all matched exactly.

Reusable tooling: `scripts/seed-volume.ts` (creates and removes a synthetic
tenant, marked by a reserved VAT number so cleanup cannot touch anything
else), `scripts/bench-queries.ts`, `scripts/bench-shape.ts` (separates round
trips from rows transferred — they fail differently and both matter).

### Not covered

Bundle size per route was not reviewed. Everything else in the original
five domains was.

If these are dispatched to parallel agents, **every agent needs
`isolation: "worktree"` created from a branch that has the current work
committed** — the 2026-07-20 `git stash` incident and the 2026-07-21 stale

---

## Phase 5 — Security audit, remaining surface *(parallel agents)*

Five red-team passes have run; five Critical bugs were found and fixed. The
categories with known open items:

- **Non-invoice audit trail.** `AuditEntry` is entirely invoice-centric —
  `addAuditEntry` has no path for an event without an `invoiceId`. There is no
  record of failed logins, permission denials, password resets, role changes,
  or certificate issuance. For compliance software that cannot answer "who did
  what, when" outside invoices, this is a real gap.
- **`branchId` scoping (PRD FR5).** The selector persists a choice and
  `Invoice.branchId` is stored, but no API route filters by it. A documented
  requirement silently unmet; also a tenancy question once branches are a
  Pro feature.
- **Rate limiter trusts `X-Forwarded-For`** with no trusted-proxy validation.
  Mitigated on Vercel, a real problem for any self-hosted deployment — which
  Phase 8 is about to make more likely.
- **Two known dependency advisories** deliberately deferred: the postcss/next
  chain (audit's "fix" is a Next downgrade) and adm-zip/onnxruntime-node via
  the optional local embedding provider. Both need a manual major bump on a
  branch with a real smoke test.
- **Retest the whole authorization surface after Phase 2**, because licensing
  adds a second axis to every check and plan gating is exactly the kind of new
  code that reintroduces a truthy-guard bypass.

---

## Phase 6 — Rename completion

The product is already "Fatoora Lite Pro" throughout the UI, docs, portal,
manifest, PDF metadata and CSR common name. What remains is external and is
mostly owner action:

- GitHub repository description, topics, social preview. The **slug stays
  `fatooralite`** — renaming breaks the remote and the Vercel git connection
  for cosmetic gain.
- Vercel project display name; the project name and `fatooralite/` root
  directory stay.
- `package.json` `name` stays `fatooralite` (a technical identifier).
- Verify `NEXT_PUBLIC_APP_NAME`-style values on Vercel if any are set.

---

## Phase 7 — Market research

Deliverable: `docs/17-market-analysis.md`.

Scope: the ZATCA-accredited and ZATCA-adjacent vendors (Wafeq, Qoyod, Zoho
Books KSA, Odoo partners, Mudad, ClearTax KSA, Sada, plus the direct-to-ERP
integrators), their pricing tiers, what they charge for, and what their users
actually complain about (G2, app store reviews, Saudi accounting forums,
LinkedIn). Then map each finding onto this product: what we already do better,
what is genuinely missing, and what is a deliberate non-goal.

Do this **before Phase 2's pricing is finalized** — the tier boundaries above
are a reasoned guess, not a researched one, and pricing is far cheaper to
change before customers exist.

---

## Phase 8 — Simplified deployment

Goal: a competent developer deploys this without the owner in the room.

- Rewrite `docs/09-deployment.md` as a linear path with exactly one supported
  target (Vercel + Neon) and everything else in an appendix. It has grown by
  accretion across sessions and now reads as a changelog.
- A `scripts/preflight.ts` that validates a `.env` before first boot:
  every required variable present, `DATABASE_URL` reachable, `pgvector`
  installed, `ENCRYPTION_KEY` the right length, `AUTH_SECRET` ≥ 32 chars —
  with the exact command to fix each failure. Most support load is
  environment misconfiguration.
- One-click Vercel deploy button with the environment variables declared.
- Document the two gotchas that have already cost real time: `tr -d '\r\n'`
  (not `-d '\n'`) when generating secrets through a Bash pipe on Windows, and
  that `vercel env pull` does not reliably return `--sensitive` values, so
  `ENCRYPTION_KEY`'s only reliable copy is the local `.env` — losing it means
  losing every tenant's ZATCA private keys permanently.

---

## Phase 9 — Multi-customer provisioning *(needs a detailed plan)*

The architecture is already multi-tenant: one deployment, `companyId` on every
row, tenant scoping enforced at one chokepoint. So "onboard a new customer"
should be self-service registration, not a new deployment. What is missing is
the operational layer around it:

- **Self-service signup → trial → guided setup → productive** with no manual
  step. Registration, trial provisioning (Phase 2), the six-step wizard and
  ZATCA activation already exist; they have never been walked end to end as
  one unbroken path by someone who has not seen the product.
- **A platform-admin surface.** There is deliberately no platform-admin role —
  all five roles are tenant-scoped. Provisioning, suspending, extending a
  trial, or diagnosing a stuck tenant currently means direct database access.
  Adding one is a genuine security decision (it breaks the "every role is
  tenant-scoped" invariant that three separate IDOR fixes depend on) and needs
  its own threat model, not an afterthought.
- **Tenant lifecycle**: suspend, resume, export-all, and delete with a
  retention window. Data retention is already a published policy page.
- **Onboarding telemetry** — which wizard step tenants abandon. Without it,
  improving the funnel is guesswork.

---

## Suggested order

1. ~~**Phase 1**~~ — done.
2. ~~**Phase 2**~~ — core done. Licensing was pulled ahead of market research
   because nothing ships commercially without it, and the tier *boundaries* are
   cheap to move later (they are one table in `entitlements.ts`); only the
   price is genuinely research-dependent, and it is still a placeholder.
3. ~~**Phase 5 retest**~~ — done, plus the Next.js advisories.
   ~~**Phase 4**~~ — done; only bundle-size review was left uncovered.
4. **Phase 7** — market research, to settle pricing before checkout goes live.
5. **Phase 3** — AI depth. Highest demo value, lowest launch risk.
6. **Phase 8, then 9** — deployment simplicity first, then the provisioning
   layer on top of it.
7. **Phase 6** — cosmetic, do it whenever.

Phase 2 is now complete. What remains inside it is not engineering: four
entitlement flags (bulk import, API keys, custom branding, advanced reports)
are declared and enforced with nothing behind them yet, and the Pro price is
still a placeholder pending Phase 7.

**A note on method, earned the hard way.** Phases 1, 2 and 4 each turned up a
defect that made a headline feature unusable — onboarding that could not be
finished, a demo tenant that could not reach its dashboard, a service worker
that had never registered — and none of them were visible in source review.
Two were found by running the app, one by writing a test that derived its
expectations from the schema instead of from the code under test. Prefer both
over another reading pass.

The owner-blocked items at the top gate the actual launch date regardless of
where engineering gets to.

---

## Production audit — 2026-08-18

Ran the Master Production Audit and the Advanced Audit Addendum together as one
specification: **1069 actionable items**, all reconciled. Full report, findings
register and per-item ledger in `docs/audit/`.

**Verdict: NOT READY**, on two blockers, neither of which is engineering work
left undone in this repository:

1. No ZATCA round trip has ever been performed — blocked on a Fatoora portal OTP.
   Local validation (7/7) and sandbox reachability are the only levels verified.
2. Arabic invoice PDFs cannot be generated at all (`WinAnsi cannot encode "ش"`).

### Delivered versus planned

Planned: audit, report, and fix what is safely fixable.
Delivered: **13 defects fixed**, each FAILED → FIXED → RETESTED → GREEN, and the
test suite moved from **285 passed / 43 skipped to 363 passed / 0 skipped**.

Four of the thirteen were financial or compliance-affecting:

- Document-level discounts computed VAT on the undiscounted base, and the XML's
  TaxSubtotal rows disagreed with the document total (EN16931 BR-CO-13/17).
  Latent — no caller supplies allowances yet — but the UBL builder emits them.
- VAT returns filtered on `createdAt` against server-local month boundaries, so
  invoices landed in the wrong tax period.
- The ZATCA CSID secret was stored in clear text beside an encrypted private key.
- The `submitted` invoice state was documented and read but never written, so a
  crash after ZATCA accepted looked exactly like never having sent.

### What this phase confirmed about method

The single highest-value action was **running the tests that had never run**.
CI had reported 285 passed / 43 skipped for a long time; the skipped half
included a suite that was itself broken (a hard-coded VAT number on a unique
column), so 18 licensing assertions had never executed once. A skipped test is
not a passing test, and the CI gate was structurally unable to say so.

That extends the note above: prefer running the app, prefer tests whose
expectations come from the schema — and check that your tests actually execute.

### Not done, deliberately

Arabic PDF rendering (needs a shaping engine, not a patch), the security audit
trail (needs a migration and a read surface), and the VAT-return scope question
(a tax decision, not an engineering one) are all documented in the report with
the reasoning, rather than half-built.

---

## Remediation Phase 1 — 2026-08-18

Programme planned in full (`docs/audit/remediation-roadmap.md`), then **one phase
executed**. Delivered W1 (Arabic invoice PDF) and W2 (security/actor audit
trail), the two P0 blockers that were solvable in this repository.

Ledger moved **461 → 481 GREEN** of 1069. Test suite **363 → 402 passed, 0
skipped**. All five CI gates green.

W1 chose an embedded Unicode font over an HTML→PDF pipeline because pdf-lib
already runs fontkit's OpenType shaper — the joining behaviour was there, only
the font and a bidi pass were missing. That avoided putting Chromium into a
serverless deployment for a capability the codebase nearly had.

Three RTL items stay PARTIAL rather than being claimed: Arabic text renders
correctly everywhere, but a *mirrored* right-to-left page layout is a design
change and was not done.

Phase 2 (W3 idempotency/reconciliation, W4 observability, W5, W6, W7, W26) is
planned and **not started**. Three decisions — D1 VAT-return scope, D7 Control
Center launch requirement, D8 WhatsApp launch scope — are analysed with
recommendations and await the owner.

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
| Tests | 184 passing / 34 skipped (DB-gated), `tsc` clean, `zatca:validate` 7/7. |
| Repo | 18 semantic commits, `v0.1.0`–`v0.3.0` tagged, release policy documented, attribution guard installed, stale branches cleaned. |

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

## Phase 2 — Trial and Pro licensing *(needs a detailed plan)*

Decision taken: **7-day trial with the full compliance path but capped volume
and reserved premium capability. No permanent free plan.**

| | Trial (7 days) | Pro |
| --- | --- | --- |
| ZATCA sign / clear / report / QR / PDF | yes | yes |
| Invoices per month | 25 | unlimited |
| Branches | 1 | unlimited |
| Seats | 2 | unlimited |
| AI assistant, read-only tools | yes | yes |
| AI write actions (`createInvoice`, `submitInvoice`, `addCustomer`, `addProduct`) | no | yes |
| Bulk import / export | no | yes |
| API keys | no | yes |
| Custom invoice branding | no | yes |
| Advanced reports | no | yes |

### Task 2.1 — Model the trial

`PlanId` is currently `"free" | "pro"`. Replace with `"trial" | "pro" |
"expired"`. `Subscription` gains `trialEndsAt`. A company created by
registration gets a trial row with `trialEndsAt = now + 7 days` — today
nothing creates a `Subscription` at all, and `getEffectivePlan` treats a
missing row as free, which under a paid-only product must instead be an
explicit trial.

Rewrite `getEffectivePlan` to a pure, testable resolver over
`{plan, status, trialEndsAt, currentPeriodEnd, now}` so every state
(trial active, trial lapsed, pro active, pro lapsed, no row) is unit-tested
without a database. Keep the conservative default: anything ambiguous resolves
to the *lower* tier.

### Task 2.2 — One enforcement helper, used everywhere

`checkInvoiceLimit` is the only gate today, on one route. Add
`requireFeature(companyId, feature)` in `lib/billing/` returning a typed
result, and call it from: `POST /api/invoices` (volume), branch creation,
user invitation (seats), `executeTool` in `lib/ai/tools.ts` (write actions),
and every Pro-only route added later. Server-side only — a hidden button is
not an entitlement.

An expired trial must be **read-only, not locked out**: viewing, exporting and
downloading past invoices stays available. A compliance product that hides a
tenant's own filed invoices behind a paywall is a liability.

### Task 2.3 — Make the boundary visible without being intrusive

- Persistent, dismissible trial banner: days remaining, invoice count against
  the cap, one "Upgrade" action. Escalates in tone at 3 days and at 1 day.
- Pro-only affordances render, disabled, with a short reason and an upgrade
  link — never hidden. Users cannot want what they cannot see.
- The 402 response body carries `{feature, limit, used, upgradeUrl}` so the
  frontend renders a real explanation rather than a generic error.
- Settings → Billing shows plan, trial end date, usage against every limit.

**Acceptance:** unit tests for every plan-resolution state; an integration
test proving a trial tenant is refused the 26th invoice and a Pro tenant is
not; an e2e test that an expired trial can still open and export an existing
invoice.

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

## Phase 4 — Full product audit *(parallel agents)*

Five independent domains, no shared state, one agent each. **Every agent runs
with `isolation: "worktree"` created from a branch that has the current work
committed** — the 2026-07-20 `git stash` incident and the 2026-07-21 stale
worktree problem both trace to ignoring this.

1. **Visual consistency** — dark and light across every route; token usage vs
   hardcoded colors; spacing and typography scale; empty, loading and error
   states present on every data surface.
2. **Responsive** — 360 / 768 / 1024 / 1440 on every page; the invoice table,
   the wizard and the AI dock are the likely failures.
3. **Accessibility** — beyond the wizard sweep in Task 1.2: focus order, skip
   links, contrast ratios, `aria-live` on async regions, keyboard-only
   traversal of the whole app.
4. **Broken flows and edge cases** — every user journey end to end with an
   empty tenant, a fully populated tenant, and an expired session. Includes
   the known gap that the frontend does not detect a mid-session 401 and
   prompt re-login; existing `.catch(() => {})` calls swallow it silently.
5. **Performance** — bundle size per route, server response times, N+1s under
   realistic row counts (the DB audit found none at seed scale, which proves
   little).

Each returns findings with file:line and a severity, not fixes. Triage
centrally, then dispatch fix agents — one bug, one agent, one summary.

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
2. **Phase 7** — market research runs in the background and its output changes
   Phase 2's tier boundaries and pricing.
3. **Phase 2** — licensing. Nothing ships commercially without it.
4. **Phase 5 retest + Phase 4** — audit after licensing exists, not before;
   plan gating adds a new authorization axis to re-verify.
5. **Phase 3** — AI depth. Highest demo value, lowest launch risk.
6. **Phase 8, then 9** — deployment simplicity first, then the provisioning
   layer on top of it.
7. **Phase 6** — cosmetic, do it whenever.

The owner-blocked items at the top gate the actual launch date regardless of
where engineering gets to.

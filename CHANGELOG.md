# Changelog

All notable changes to Fatoora Lite Pro are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/) and
[Semantic Versioning](https://semver.org/). Release process and branching
conventions: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## [Unreleased]

### Added

- **Production-readiness audit and remediation programme (2026-08-18 →
  2026-08-20).** A full audit against 1,069 checklist items, then seven
  remediation phases plus nine explicit product decisions (D1–D9), merged
  to `main` 2026-08-20. Full write-up: `docs/16-launch-plan.md`'s
  remediation sections; day-by-day detail: `handoff.md`.
- **CSV import and export** for customers and products (Pro plan),
  synchronous with size/row caps, refuses the whole file rather than
  partially importing on any row error.
- **Email invoice delivery** — send a PDF invoice by email directly from
  the app; the recipient is always the invoice's own customer record,
  never an address supplied by the caller.
- **WhatsApp invoice delivery** via the Meta Cloud API, with a temporary
  self-hosted (OpenWA) transport available as an interim option while
  Meta Business verification is pending. Off by default.
- **Server-side feature flags**, admin-controlled, fail closed to the
  code default if the flag store is unreachable.
- **Dual VAT reporting.** `/api/reports` now returns both a "declarable"
  figure (every issued invoice) and a "cleared" figure (ZATCA-cleared
  only), both net of credit/debit notes, shown side by side.
- A **non-blocking warning** when an invoice is dated into an
  already-elapsed VAT reporting period.
- A **read-only, fully audited cross-tenant support surface**
  (`/api/operator/*`), credential-gated, for diagnosing a customer's
  account without giving any role standing tenant-wide access.
- **Row-Level Security** at the Postgres level as an additional,
  independently-tested defence layer (opt-in — not yet the primary
  access path for every query).
- A **structured security and administrative audit trail** — logins,
  permission denials, role changes, and certificate issuance are now
  recorded and queryable, not just invoice actions.
- All legal pages (`/terms`, `/privacy`, `/refund-policy`,
  `/cancellation-policy`, `/data-retention`, `/acceptable-use`) rewritten
  from placeholder text into real drafts describing what the product
  actually does. **Still pending review by qualified legal counsel.**
- ZATCA submission retries are now idempotent, with an automatic
  reconciliation job for anything stuck mid-submission.
- **Paid-only licensing: a 7-day trial and Pro.** The free tier is gone. The
  trial gets the whole ZATCA compliance path (sign, clear, report, QR, PDF)
  capped at 25 invoices a month, 1 branch and 2 seats; Pro removes the caps and
  unlocks AI write actions, bulk import/export, API access, custom branding and
  advanced reports. Enforced server-side at invoice creation, branch creation,
  user invitation and the AI tool executor, each returning a 402 carrying the
  plan, the limit and an upgrade URL. Plan resolution
  (`lib/billing/entitlements.ts`) is pure and conservative — a lapsed payment,
  a cancelled row, an unknown plan name and a missing row all resolve down.
- **Groq** as a fourth AI backend (`AI_PROVIDER=groq`), alongside OpenRouter,
  Anthropic and OpenAI. Added for latency, so the assistant's tool calling is
  fast enough to demonstrate live.
- Trial status strip in the app shell and a full plan/usage panel in
  Settings → Billing.
- Layer boundaries (`lib/zatca` → `lib/db` → `lib/services` → `app/api` → UI)
  are now lint-enforced rather than a convention.
- Repository release process: semver policy, branch naming, a release
  checklist, historical tags `v0.1.0`–`v0.3.0`, and a `commit-msg` hook that
  rejects assistant attribution trailers.

### Security

- **`main` is now branch-protected on GitHub**: a pull request and
  passing CI (lint, tests, build) are required before merge, and
  force-push / branch deletion are blocked.
- The AI assistant's global re-index is now restricted to an operator
  credential (any tenant owner could previously trigger it), and every
  AI call now records token/latency usage for accounting.
- **Next.js 16.2.9 → 16.3.0**, closing nine advisories. The one that matters
  most here is a middleware/proxy bypass in App Router applications — this
  app's entire authentication gate is `proxy.ts` — alongside SSRF in rewrites
  and in Server Actions, cache confusion of response bodies (a cross-tenant
  leak shape in a multi-tenant product), and unauthenticated disclosure of
  internal Server Function endpoints. Also clears postcss (arbitrary `.map`
  file read via attacker-controlled `sourceMappingURL`), undici,
  brace-expansion and @tailwindcss/postcss. 9 advisories → 4, the remainder
  being adm-zip and sharp via the optional local-embedding provider, with no
  fix available at any version.
- **Starting a checkout could end a live trial.** `POST /api/billing/checkout`
  wrote `plan: "free"` when creating a subscription row; "free" is no longer a
  recognised plan and resolves to expired. It now records the payment
  processor's invoice id and touches nothing else — only a verified webhook
  changes entitlement.
- 28 adversarial tests against the plan resolver, covering the guard-fails-open
  shape behind every previous Critical finding in this codebase, plus
  structural checks that each creation route still calls its limit gate and
  that tenant verification precedes plan resolution.

### Fixed

- **Arabic invoice PDFs no longer fail to render.** Any Arabic or
  mixed-script customer name previously returned a 500 on an
  already-signed, already-numbered invoice. Now renders correctly with an
  embedded font and proper bidirectional text shaping.
- **A credit or debit note was inflating the VAT return instead of
  reducing it.** Corrected, and both VAT figures are now reconciled
  through a single shared calculation instead of three separately-wrong
  ones.
- **The production support routes (`/api/operator/*`) were unreachable**
  due to a proxy misconfiguration that pre-dated this fix being noticed —
  every request 401'd before its own authorization check ever ran.
- **CI's lint step was failing, so no later CI step had ever run.**
  `npm run lint` exited non-zero on 16 pre-existing errors and runs before the
  `zatca:validate` and `npm audit` gates in the same job. All 16 are fixed and
  lint now exits 0.
- **Validation failures returned an empty error body.** Four routes caught
  errors as `any` and returned `error.errors`, which zod v4 renamed to
  `.issues` — so a 400 arrived with `{ error: undefined }` and the caller had
  no idea what was wrong. The `any` cast is what hid it.
- **An expired session looked like a broken app.** Roughly 63 client `fetch`
  calls swallowed errors, so a mid-session 401 stopped the page updating with
  no explanation, and the 402 upgrade responses were read by nothing. A single
  `window.fetch` wrapper now surfaces both: 401 redirects to sign-in with a
  reason, 402 shows the server's message and an upgrade link.
- **A fresh tenant could not finish onboarding.** `invoiceTypes` is required by
  the server-side completion guard but was collected by no wizard step,
  registration field or settings screen, so the last click of the wizard
  returned a 422 naming a field no screen exposed. Only the seeded demo
  company — which sets the value directly — was unaffected, which is why every
  prior test path missed it. Now collected in the Tax Registration step, with a
  test that derives the required-field list from the schema.
- Wizard step errors were keyed by the first word of their own message, so
  "Postal code is 5 digits" and "Enter a valid email" rendered nowhere and
  Continue silently did nothing.
- Business category, CR type and CR issue date were marked required but not
  enforced, deferring the failure to the end of the wizard.
- Every wizard field is now programmatically associated with its label
  (`htmlFor`/`id`), with `aria-required`, `role="alert"` errors and
  `aria-describedby`. Previously labels were only visually adjacent.
- The boot-time AI warning and the assistant's mock-mode message hardcoded
  `OPENROUTER_API_KEY`, so running with Anthropic or OpenAI warned about a key
  that was correctly absent and named the wrong variable to set.

### Changed

- `app/onboarding/page.tsx` split from 787 lines into step components under
  `components/onboarding/steps/` plus shared `Field`, `StepNav` and
  `WizardChrome` pieces.
- An expired trial is read-only, not locked out: existing invoices and audit
  records stay viewable and exportable. Submitting an already-issued invoice to
  ZATCA is never plan-gated — the 24-hour reporting obligation outlives any
  billing state.

## [0.4.0] — 2026-08-04 · Guided onboarding, billing, and signing correctness

### Added

- **Six-step guided onboarding wizard** — Business Identity, Tax Registration,
  Address & Contact, ZATCA Connection, Branches & Locations, Finish. Driven by
  an `ONBOARDING_STEPS` registry with per-field validation against
  `zatcaMandatoryCompanySchema`, RTL handling for Arabic fields, and contextual
  help links. Settings can deep-link into any completed step (`?step=<key>`) or
  re-run the whole wizard (`?reopen=true`).
- **`POST /api/onboarding/activate`** — collapses CCSID → compliance → PCSID
  into a single round trip and resumes from an existing compliance certificate
  instead of burning a fresh OTP.
- **Full ZATCA business profile on `Company`** — business category (14-code
  taxonomy), CR type/issue date/place, VAT registration date, economic activity,
  Saudi national address, contact details, invoice types, IBAN/bank.
- **Billing** — Moyasar hosted-checkout integration (`POST /api/billing/checkout`),
  verified idempotent webhook (`POST /api/billing/webhook`), `Subscription` model,
  plan limits enforced with a 402 on invoice creation, real usage in Settings.
  Ships inert until `MOYASAR_SECRET_KEY` is set.
- **Operations** — distributed rate limiting (Upstash REST, in-memory fallback),
  transactional email (Resend REST) so password-reset links are actually
  delivered, `GET /api/health` for uptime monitors, Dependabot for npm and
  actions, `zatca:validate` and `npm audit` steps in CI.
- **Legal pages** — the four missing routes from `proxy.ts`'s allowlist
  (`/cancellation-policy`, `/data-retention`, `/acceptable-use`,
  `/security-policy`), plus `robots.ts` and `sitemap.ts`.
- Terms-of-service acceptance at registration (`User.acceptedTermsAt`).

### Fixed

- **XAdES `SignedInfo` canonicalization dropped ancestor namespaces.** C14N 1.1
  is inclusive canonicalization and must render every ancestor namespace onto
  the canonicalized subtree's apex; `xml-crypto` only renders what it is handed
  in `ancestorNamespaces` and never walks the DOM itself. The Invoice root's
  default, `cac`, `cbc` and `ext` declarations were therefore absent from the
  bytes that were signed, so a spec-compliant verifier — including ZATCA's
  gateway — would fail `SignatureValue` verification on **every** invoice.
  Reference 2 (`#xadesSignedProperties`) additionally had no `ds:Transforms` at
  all and was digested over raw serialization. Both the unit test and
  `validate-zatca` previously re-verified with the same faulty canonicalizer, a
  tautological check that could not detect this; both now assert on the
  canonical output directly.
- **VAT was rounded per line and then summed** instead of computed once from
  each category's aggregated taxable base (EN16931 BR-CO-17). Three lines of
  0.03 SAR each round to 0.00 individually but aggregate to 0.01 — exactly the
  mismatch ZATCA's BR-KSA validation rejects. Document totals now derive from
  the same tax-subtotal result so they cannot drift from the breakdown rows.
- **Tenant isolation bypass for company-less sessions.** Four guards
  short-circuited to *allow* when `User.companyId` was null, a reachable state.
  Replaced by a single deny-by-default `isCallerCompany()` helper.
- **Password reset did not invalidate outstanding sessions** — `sessionVersion`
  was minted and incremented but never verified against the DB.
- **`AUTH_ENFORCE` defaulted open in three call sites** while `proxy.ts`
  defaulted closed, leaving API routes unauthenticated while page routes
  correctly redirected.
- **The ZATCA reporting cron failed open** when `CRON_SECRET` was unset, on a
  publicly committed route path that drives real gateway submissions. The cron
  path was also missing from `proxy.ts`'s allowlist, so with `AUTH_ENFORCE=true`
  it had never actually reached its own secret check.
- **Onboarding completion could be reached without passing steps 1–3**, on both
  the client deep link and the `PATCH /api/companies/[id]` route.
- **RAG poisoning surface** — tenant free text was retrieved alongside the
  trusted global corpus with no trust distinction. Chunks are now scope-tagged
  in the system prompt, and the confirm-before-write gate covers `addCustomer`
  and `addProduct` as well as invoice actions.
- Unauthenticated `/api/*` returns a JSON 401 instead of a 307 to `/login`.
- Re-submitting an already cleared or reported invoice is refused.
- `GET /api/health` no longer echoes raw database errors.
- `Modal` gained `role="dialog"`, a focus trap, and focus restoration on close.
- `/refund-policy` and `/contact` no longer publish commitments and support
  addresses that do not exist.

### Changed

- Product renamed **Fatoora Lite → Fatoora Lite Pro** across the UI, docs,
  portal, PWA manifest, PDF metadata and ZATCA CSR common name. The npm package
  name, the `fatooralite/` directory and the repository slug are unchanged on
  purpose — they are technical identifiers that deployment configuration
  depends on.
- `CONTRIBUTING.md` and `SECURITY.md` moved under `.github/`; loose plan
  documents consolidated into `docs/plans/`.
- `ENCRYPTION_KEY` is separate from `AUTH_SECRET`, so rotating the latter no
  longer renders stored certificate private keys undecryptable.
- `GET /api/customers` and `/api/products` cap results at 50, matching invoices
  and notifications.

### Known limitations

- Not verified against a live ZATCA gateway; that requires a Fatoora portal OTP.
- Moyasar webhook payload shape is written from published docs, not a live
  sandbox transaction.
- `confirmedAction` in the AI agent route is still a client-trusted flag rather
  than a server-minted pending-action token.
- The branch selector does not yet scope data by `branchId` (PRD FR5).
- The audit trail covers invoices only; security events are not recorded.

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

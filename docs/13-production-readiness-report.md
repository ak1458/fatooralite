# Fatoora Lite Pro — Production Readiness Report

**Date:** 2026-07-21. **Scope:** the owner's original 18-category enterprise
readiness ask (functional, OWASP security, dependencies, performance, DB,
API, auth, payment, file storage, logging, devops, compliance, legal pages,
SEO, a11y, production checklist, testing, docs), closed out across four
sessions on 2026-07-20/21 — see `handoff.md` for the full session-by-session
diary this report summarizes.

**How to read this document:** it is a snapshot, not a certificate. It says
what was checked, how, and what's still open — not "production ready" as an
unqualified claim. Two separate audit passes on 2026-07-20/21 each found a
**Critical**-severity bug (XAdES signature canonicalization, VAT rounding)
that would have been trivial to rate a clean bill of health against one
session earlier. Treat every "no action, verified adequate" line below as
true as of this date, checked by reading the actual code and running the
actual tools — not inferred from a prior report.

---

## 1. Executive summary

The core product — ZATCA Phase-2 e-invoicing (crypto signing, clearance/
reporting, PIH hash chain), multi-tenant auth/RBAC, invoicing, AI assistant
with RAG — is implemented, tested, and internally consistent. Across the
audit sessions summarized here, **8 real bugs were found and fixed**, three
of them Critical:

| Severity | Bug | Fixed in |
|---|---|---|
| Critical | XAdES `SignedInfo` C14N-11 canonicalization dropped 4 ancestor namespaces — every signature this engine ever produced would fail verification against ZATCA's real gateway | 2026-07-21 |
| Critical | `taxSubtotals()` summed already-rounded per-line VAT instead of computing VAT once from the aggregated taxable base (BR-CO-17) — real invoices could fail ZATCA's BR-KSA validation on a 1-halala mismatch | 2026-07-21 |
| Critical | Falsy-`companyId` IDOR bypass: `requirePermission`, `app/api/audit/[id]`, `app/api/ai/route.ts`, `app/api/ai/agent/route.ts` all short-circuited to *allow* a company-less session to assert any tenant's `companyId` — the agent route could act (create/submit invoices, add customers/products) on another tenant's data | 2026-07-20 / 2026-07-21 |
| High | `sessionVersion` was minted and incremented but never verified — password reset did not invalidate a stolen session cookie | 2026-07-20 |
| High | `AUTH_ENFORCE` secure-by-default flip missed 3 call sites — API routes stayed open while pages redirected to `/login`, looking secure while being worse than no protection | 2026-07-20 |
| High | Onboarding deep-link + `PATCH /api/companies/[id]` let a user reach "complete" status without ever providing ZATCA-mandatory fields | 2026-07-20 |
| High | Cron `CRON_SECRET` check failed *open* when the env var was unset, on a public endpoint that drives real ZATCA submissions | 2026-07-21 |
| High | RAG prompt injection: tenant free text was retrievable and mixed into the model's context with no trust distinction from the curated ZATCA corpus | 2026-07-21 |

Full detail on each, plus 6 more Medium/Low fixes, is in `handoff.md`.

**This session's contribution:** one more instance of the same Critical IDOR
bug class (found live in `app/api/ai/route.ts` and `app/api/ai/agent/route.ts`,
not caught by the sessions that fixed the other three call sites), 11 new
regression tests closing gaps flagged across the last four session entries,
a performance fix, an accessibility fix, and this report. Also found and
fixed a stray untracked `middleware.ts` that was failing `npm run build`
outright (unrelated to the audit — caught while verifying the build for
this report).

---

## 2. Category-by-category status

### 2.1 Functional / core product
**Status: solid.** ZATCA signing, invoicing, RBAC, onboarding, AI assistant
all implemented and exercised by the test suite. One known functional gap,
found 2026-07-20, still open: the branch/location selector persists a
choice but nothing in any API route actually filters invoices/customers/
products by the active branch (PRD FR5). Documented, not fixed — a feature
gap, not a bug with a small diff.

### 2.2 OWASP / application security
**Status: audited across 3 passes, all findings closed.** Threat-modeled,
red-teamed. All Critical/High findings above are fixed. One documented,
accepted architectural gap: `confirmedAction` in `app/api/ai/agent/route.ts`
is a client-trusted flag, not a server-verified two-step (no session-stored
pending-action token binding a confirmation to something the model actually
proposed). RBAC is still the real authorization boundary underneath, so
this is defense-in-depth/UX-safety, not a raw auth hole — Medium severity,
real, deferred as contained future feature work.

### 2.3 Cryptography (ZATCA signing)
**Status: verified against the XMLDSig/C14N-11 spec, not just self-tested.**
The XAdES canonicalization bug (above) was invisible to every prior check
because the validation script and unit tests both re-verified using the
same buggy canonicalizer that produced the signature — a tautological
self-check. Fixed with a genuinely non-circular check (`scripts/
validate-zatca.ts` now asserts the canonical output string itself contains
all 4 inherited namespace URIs) and wired into CI as its own step,
specifically because it's the one check capable of catching a
shared-canonicalizer regression that unit tests structurally cannot.
`npx tsx scripts/validate-zatca.ts` — **all 7 checks pass** as of this
report. **Not yet verified against a live ZATCA gateway** (needs a real
compliance-CSID from a Fatoora portal OTP — an owner action; see
`docs/11-onboarding-pipeline-handoff.md`). Treat the crypto fix as
high-confidence, not gateway-certified, until that round-trip runs.

### 2.4 Dependencies
**Status: audited, 5 known/tracked vulnerabilities remain, 0 critical.**
`npm audit` closed 3 of 8 findings this session via non-breaking fixes
(`brace-expansion`, `js-yaml` — dev-tooling transitive deps). The remaining
5 (2 moderate, 3 high) need a major-version bump each and are deliberately
not auto-applied:
- `postcss` (XSS in CSS stringify, bundled inside `next`) — npm's suggested
  fix path is actually a *downgrade* to `next@9.3.3` (an artifact of how it
  resolves the canary version range), not a real fix.
- `onnxruntime-node`/`adm-zip` (4GB memory allocation on a crafted ZIP) —
  only reachable via the optional local-embedding provider
  (`@huggingface/transformers`); the real fix is a breaking major bump with
  no end-to-end coverage to verify it safely in an autonomous pass.

CI gates on `npm audit --audit-level=critical` (passes) plus weekly
Dependabot (`npm` + `github-actions`). Recommend: bump `next` forward (not
to what audit suggests) on a branch with a full manual smoke test, and
either accept the transformers risk (dev/optional-path only) or budget a
manual verification pass before bumping it.

### 2.5 Database
**Status: audited, adequate.** Every tenant-scoped model has a
`companyId`/FK index (Postgres does not auto-index FK columns). Migration
history was fully repaired this week (several models had drifted via stray
`db push` calls with no `CREATE TABLE` anywhere in history) —
`prisma migrate dev` now genuinely works, proved under repeated real use
across multiple sessions. No N+1 patterns in `lib/db/queries.ts`.

### 2.6 API
**Status: all 36 routes re-verified for the one bug class that keeps
producing real findings (tenant scoping); exactly 2 found, both fixed this
session.** Status codes, Zod validation, and typed-error→HTTP mapping are
consistently applied everywhere spot-checked. An exhaustive line-by-line
pass on every route (pagination semantics, idempotency beyond the
already-fixed duplicate-invoice-number and double-submission cases) was not
done — diminishing returns for this scope; defer unless a specific route
misbehaves in practice.

### 2.7 Auth / RBAC
**Status: hardened, tested.** `sessionVersion` enforcement, `AUTH_ENFORCE`
consistency, and the falsy-`companyId` IDOR class (4 call sites total, all
now routed through one shared `isCallerCompany()` helper in
`lib/auth/server.ts`) are all fixed and now have regression tests. 5 system
roles, all tenant-scoped — no platform-admin bypass exists.

### 2.8 AI / RAG
**Status: hardened.** Every retrieved knowledge chunk is now tagged
`[global]` (trusted ZATCA corpus) or `[tenant-data]` (unsanitized tenant
free text, reference-only, explicitly instructed never to be treated as a
command) in both AI routes' prompts, closing a prompt-injection vector. The
confirm-before-write gate covers `createInvoice`/`submitInvoice`/
`addCustomer`/`addProduct`. Cross-tenant RAG leakage (the two new IDOR bugs
this session) is fixed and covered by a new DB-gated test
(`lib/ai/vector-store.test.ts`) proving a query scoped to one company never
returns another company's chunks.

### 2.9 Compliance (ZATCA business rules)
**Status: verified by hand and by test.** The VAT-rounding fix (§1) and its
regression test lock in ZATCA/EN16931 BR-CO-17 (VAT computed once per tax
category from the aggregated taxable amount, not summed from independently
rounded per-line amounts). Document totals are now derived from the same
`taxSubtotals()` result as the breakdown, so the two can never drift apart
(also itself a UBL/EN16931 requirement). Not covered: real concurrent-
invoice issuance under load (the PIH `FOR UPDATE` lock is correctly
implemented and unit-tested sequentially, but never exercised with real
`Promise.all` concurrency against a test DB) — Low priority since the fix
is confirmed correct by code inspection, but a genuine coverage gap.

### 2.10 Legal pages
**Status: complete, accurately disclaimed.** All 8 routes referenced in
`proxy.ts`'s allowlist now have real pages. Three pages that stated
concrete, unqualified commitments (fabricated support emails, unreviewed
"refunds within 14 days" for a plan with no payment processor) were fixed
to either show real, verified information or carry the same DRAFT
disclaimer as `/terms`/`/privacy`. `/security-policy` uses real content
adapted from `.github/SECURITY.md`.

### 2.11 SEO
**Status: no action needed, verified adequate.** `app/robots.ts`,
`app/sitemap.ts`, `app/favicon.ico`, OpenGraph/Twitter metadata in
`app/layout.tsx` all present and correct. Not spending further time here —
low value for what is mostly an authenticated app shell, confirmed twice
across two sessions.

### 2.12 Accessibility
**Status: proportionate pass, deliberately not a full WCAG-AA sweep** (an
authenticated B2B shell has lower a11y stakes than a public site, and it's
not a ZATCA requirement — a full sweep would be disproportionate effort for
this scope, stated explicitly rather than silently skipped). `npm run lint`
bundles `jsx-a11y` via `eslint-config-next` and runs in CI — **zero
`jsx-a11y` findings**. Manual keyboard check of `components/common/
Modal.tsx` found and fixed a real gap: no `role="dialog"`/`aria-modal`, no
focus trap, no focus-return to the trigger on close — all three fixed.
**Open, documented, not fixed:** the onboarding wizard's step components
(`app/onboarding/page.tsx`) use bare `<label>` elements next to `<input>`/
`<select>` with no `id`/`htmlFor` association, across every step, not just
one — visually adjacent but not programmatically linked for screen readers,
and clicking label text doesn't focus the field. Real gap; fixing it
properly means touching every field in every step, which is a dedicated
pass, not a spot-check fix — flagged rather than partially patched.

### 2.13 File storage
**Status: N/A, verified, not silently skipped.** Grepped `app/api/**` for
`FormData`/`multipart`/`upload` — zero results. No user-uploaded files
exist anywhere in the product (no logo upload, no attachments). PDFs are
generated on-demand in-memory and streamed
(`app/api/invoices/[id]/pdf/route.ts`), never persisted to disk or object
storage. There is no file-storage subsystem to audit.

### 2.14 Payment
**Status: N/A, owner decision, unchanged.** No KSA payment processor is
integrated (Stripe doesn't support KSA merchants). Owner needs to pick
Moyasar/Tap/Paddle-as-MoR; the billing skeleton
(`lib/billing/plan.ts`) already enforces plan limits server-side —
flipping a DB row is all it takes to unlock a tenant once a processor is
chosen.

### 2.15 Logging / audit trail
**Status: adequate for its stated purpose, with a known scope gap.**
`AuditEntry` gives a tamper-evident record of every document sent to
ZATCA — the auditor persona's core need, and it's covered. **Open,
documented:** there is no audit trail for security-relevant events outside
an invoice submission — failed logins, permission-denied responses,
password resets, role/user management changes, certificate issuance. Real
gap if the business ever needs to answer "who did what, when" beyond
invoices; not building a general event-log system in this pass.

### 2.16 DevOps / CI
**Status: hardened this week.** CI runs lint → dependency audit
(critical-gated) → unit tests → `zatca:validate` → build, in that order,
specifically so a shared-canonicalizer bug can't hide behind a green unit
test run. `.github/dependabot.yml` added (npm weekly + github-actions).
**Open, owner action needed:** GitHub branch protection on `main` —
confirmed via `gh api` (re-checked for this report) that it is still
**unprotected**. Not something to flip unilaterally without confirming the
review-requirement tradeoff with the owner. `tests/e2e/{auth,smoke}.spec.ts`
exist but are not wired into CI — needs a running app + seeded DB in CI,
real infra work, deferred.

### 2.17 Testing
**Status: 127 passed / 31 skipped, 0 failing** (`npx vitest run`), up from
89 at the start of this week's work. `npx tsc --noEmit` clean. This
session added 11 new tests closing gaps repeatedly flagged across four
prior session entries: `isCallerCompany` (5 cases, covers the falsy-
`companyId` fix across all 4 call sites), RAG scope round-trip
(`lib/ai/vector-store.test.ts`, DB-gated), and the `confirmSummary`
write-gate (`lib/ai/tools.test.ts`, 6 cases). Skipped tests are DB-
integration tests gated on `TEST_DATABASE_URL`, not disabled/broken tests.
**Still open:** the concurrent-invoice PIH-lock race test (§2.9), e2e not
run in CI (§2.16).

### 2.18 Production checklist / docs
**Status: current.** `docs/09-deployment.md` has a real Disaster Recovery
section (Neon PITR steps, secret backup, restore-drill recommendation) —
was one unchecked checklist line before this week. This report is the
closing artifact for the checklist's audit item.

---

## 3. Open items — full list

Nothing below is a silent gap; each was found, evaluated, and deliberately
not fixed in-session, with reasoning in `handoff.md`.

| Item | Severity | Owner action needed? |
|---|---|---|
| Live ZATCA gateway round-trip (real compliance CSID) | — | Yes — Fatoora portal OTP |
| KSA payment processor selection | — | Yes — Moyasar/Tap/Paddle |
| Real legal copy (replace DRAFT banners) | Medium (business risk) | Yes — legal review |
| GitHub branch protection on `main` | — | Yes — review-requirement tradeoff |
| `confirmedAction` server-side pending-action binding | Medium | No — contained future feature work |
| `branchId` scoping not enforced (FR5) | — | No — feature gap, product prioritization |
| Non-invoice audit-log coverage | — | No — scope decision |
| Onboarding wizard label/`htmlFor` a11y sweep | Low | No — dedicated pass |
| Concurrent-invoice PIH-lock race test | Low (coverage only, fix already verified correct) | No |
| e2e suite not wired into CI | — | No — infra work |
| `next`/postcss and `onnxruntime-node`/adm-zip major bumps | Moderate/High (dependency) | No — needs manual smoke test |

## 4. Verification run for this report

All of the following were re-run immediately before writing this report,
not carried forward from earlier in the week:

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **127 passed / 31 skipped, 0 failing**.
- `npx tsx scripts/validate-zatca.ts` — **all 7 checks pass**.
- `npm run build` — succeeds. (Found and fixed a stray untracked
  `middleware.ts` blocking this outright — see `handoff.md`.)
- `npm audit` — 5 vulnerabilities (2 moderate, 3 high), 0 critical, all
  tracked and reasoned about above.
- `gh api repos/:owner/:repo/branches/main/protection` — confirmed still
  unprotected.

**Bottom line:** the product is functionally and cryptographically sound,
security-hardened across three audit passes with all Critical/High findings
closed, and the open items above are genuinely deferrable (owner decisions,
low-severity coverage gaps, or scoped-down categories with stated reasoning)
rather than hidden risk. This is an honest "ready, with a known and bounded
punch list" — not a claim that nothing is left.

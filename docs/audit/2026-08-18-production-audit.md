# Production Audit — Fatoora Lite Pro

**Date:** 2026-08-18
**Scope:** Master Production Audit + Advanced Audit Addendum, in full — 1069 actionable items.
**Method:** Every finding below was reproduced against a running production build
(`next start`, `NODE_ENV=production`, `AUTH_ENFORCE=true`) backed by an isolated
Neon database seeded with two independent tenants. No result in this document is
inferred from reading code alone.

Companion files:

- `2026-08-18-ledger.md` — every one of the 1069 items with its status and basis.
- `2026-08-18-findings.md` — the findings register with reproduction detail.

---

## 1. Executive summary

Fatoora Lite Pro's **security core is genuinely sound**, and that is the most
important result here. Twenty-five cross-tenant read and write attacks were
refused. Privilege escalation was refused at every level tested. Client-supplied
invoice totals are recomputed server-side, and a spoofed seller identity never
reaches the signed XML. The ZATCA cryptographic chain did not fork under
concurrency. RAG retrieval leaked nothing across tenants under five separate
prompt-injection attempts.

Against that, the audit found and fixed **thirteen real defects**, four of them
financial or compliance-affecting, and confirmed that several headline
capabilities named in the specification **do not exist in the repository at all**.

The product is **NOT READY** for production, for two reasons that no amount of
engineering in this repository can resolve today:

1. **No ZATCA round trip has ever been performed.** Local validation and sandbox
   reachability are verified; a real clearance is blocked on a Fatoora portal OTP.
2. **Arabic invoice PDFs cannot be generated.** Any Saudi business with an Arabic
   customer name can issue and sign an invoice, then never print or send it.

Nothing in this document should be read as ZATCA certification, and no such
claim is made anywhere in the product.

---

## 2. Ledger reconciliation

| Status | Count |
|---|---|
| GREEN | 461 |
| PARTIAL | 291 |
| FAILED | 9 |
| MISSING | 192 |
| RISK | 5 |
| UNKNOWN | 9 |
| N/A | 102 |
| **TOTAL** | **1069** |

461 + 291 + 9 + 192 + 5 + 9 + 102 = **1069 = TOTAL ✓**

Audited: 1069. Pending: 0. Skipped: 0. Unaccounted: 0.

The 9 UNKNOWN items are all blocked on owner-side credentials (ZATCA portal OTP,
Neon console, Moyasar merchant account) and are named individually in §8.

The 102 N/A items are almost entirely the Master Audit's desktop-application and
auto-update sections. This product is a web SaaS: installers, code signing,
notarization, SmartScreen, portable builds and update packaging genuinely do not
apply, and users receive the current version on page load. Each is marked N/A
with that reasoning in the ledger rather than counted as a gap.

---

## 3. Defects found and fixed

All thirteen follow FAILED → FIXED → RETESTED → GREEN, with the retest recorded.

| # | Defect | Severity |
|---|---|---|
| F-01 | Logout did not revoke the session server-side | High |
| F-02 | Rate limiter defeated by rotating `X-Forwarded-For` | Medium |
| F-03 | Email case mismatch caused permanent password-reset lockout | Medium-High |
| F-04 | Unvalidated login body produced attacker-triggerable 500s | Medium |
| F-05 | NUL byte in any path/query produced unhandled 500s | Low-Medium |
| F-06 | ZATCA CSID secret stored in clear text | High |
| F-07 | Working tenants were told they had no certificate | Medium |
| F-08 | 18 licensing tests had never executed | Medium |
| F-09 | Stale expectation in the repository test | Low |
| F-17 | Document-level discounts computed VAT on the undiscounted base | High |
| F-18 | VAT returns used the wrong date field and the wrong timezone | High |
| F-19 | Concurrent invoice issuance failed, leaking Prisma internals | Medium |
| F-24 | AI assistant received money as strings | Low-Medium |

### The four that matter most

**F-17 — VAT computed on the wrong base.** `invoiceTotals()` subtracted a
document-level allowance from the taxable total but left VAT computed from the
*unreduced* base. A 1000 SAR invoice with a 100 SAR discount produced taxable 900
but **VAT 150** — the buyer charged VAT on money never billed. A document-level
charge had the mirror error, under-declaring 15 SAR of VAT to ZATCA. The returned
`taxSubtotals` still described the old base, so the signed XML's breakdown summed
to 1000 while the document said 900; EN16931 BR-CO-13/BR-CO-17 require agreement,
so any such invoice was built to be rejected. **Latent, not live** — no current
caller supplies document-level allowances — but the UBL builder already emits
`cac:AllowanceCharge`, so the first feature to use it would have inherited both.

**F-18 — VAT returns misstated the period.** `/api/reports` filtered on
`createdAt` (row insertion) instead of `issueDate` (the tax point), against month
boundaries built with `new Date(year, m, 1)` — midnight in the *server's*
timezone. Proven: three invoices issued 15 Jul, 31 Jul and 10 Aug produced
**July = 0 invoices, August = all three**. Correct is July 2, August 1.

**F-06 — Gateway credentials in clear text.** `Certificate.privateKey` was
AES-256-GCM encrypted; `Certificate.secret` beside it was not — and `token` +
`secret` together are the HTTP Basic credential presented to Fatoora. Anyone with
database read access could have filed as that taxpayer.

**F-21/F-22 — The ZATCA crash window.** Covered in §4.

---

## 4. The ZATCA submission crash window (Addendum §3 / §16)

The Addendum's central scenario is: *submit to ZATCA → ZATCA accepts → the app
dies before recording the result.*

`Invoice.status` documents a `submitted` state, and both `lib/db/queries.ts` and
`lib/status.ts` **read** it — but **nothing ever wrote it**. A test proved the
invoice read `signed` throughout the gateway call. A process death after
acceptance (a Vercel function hitting `maxDuration` on a slow gateway is the
ordinary way this happens) left the invoice indistinguishable from never-sent,
and the only recourse was to send it again.

Compounding it, the gateway `fetch` had **no timeout at all**, so an
unresponsive Fatoora held the request open until the platform killed the
function — manufacturing exactly that window.

Fixed: the invoice is marked `submitted` before the call; the four post-response
writes now run in one transaction (previously a failure between them could leave
a `ClearanceRecord` reading "accepted" beside an invoice reading `signed`); and
the gateway call is bounded at 30s, inside the routes' 60s `maxDuration`.

This narrows the window and makes the state truthful. It does not make retry
free — nothing short of gateway deduplication does, and ZATCA keys on
`invoiceHash` + `uuid`, both unchanged on a resend. An invoice sitting in
`submitted` is now honestly flagged as one whose fate is unknown.

---

## 5. What was verified to actually work

- **Tenant isolation.** 25 cross-tenant attacks refused (invoices, customers,
  products, dashboard, reports, audit, PDF, clearance, user promotion,
  certificate provisioning, checkout).
- **Privilege escalation.** Employee self-promotion, role forging, settings
  edits and clearance all refused 403.
- **Invoice integrity.** Client-sent `grandTotal:1` on a 1000 SAR invoice was
  recomputed to 1150. A spoofed seller VAT never reached the signed XML.
  Duplicate invoice numbers → 409. No update or delete route exists.
- **Concurrency.** 8 simultaneous issues all persisted exactly once; 13 chained
  invoices produced 13 distinct hashes and zero chain forks; a double-submitted
  invoice number stored exactly one row.
- **Licensing.** 12 adversarial checks: expired trial refused issuing but
  retained read/export/clearance (the documented invariants), deleting the
  Subscription row did not re-grant a trial, `past_due` and lapsed Pro refused,
  branch and seat caps enforced server-side, client-supplied plan fields ignored.
- **AI.** RAG leaked no tenant-B marker across five injection attempts; system
  prompt extraction refused; tool RBAC denied every employee attempt.
- **Cryptography.** XAdES verifies over in-context C14N-11 `SignedInfo` with all
  four inherited namespaces; digest recomputation matches; QR is correct TLV with
  raw-binary tags 6–9 including tag 9.
- **Disaster recovery, actually simulated.** All 16 tables exported, restored
  into a fresh database, and the application booted against it: customer logs in,
  onboarding state intact, invoices/customers/products/certificate all resolve,
  money identical, chain unforked.

Test suite: **285 passed / 43 skipped → 363 passed / 0 skipped.**

---

## 6. Blockers

### Critical

1. **No ZATCA production or sandbox round trip (M-591, M-224, M-667).**
   Blocked on a Fatoora portal OTP. Local validation (7/7) and sandbox
   reachability (HTTP 401 without a CSID, as expected) are the only verified
   levels.
2. **Arabic invoice PDFs fail (F-23, M-595, M-714).** `WinAnsi cannot encode
   "ش" (0x0634)`. English → 200; Arabic or mixed → 500. ZATCA requires the
   human-readable invoice in Arabic. Deliberately not fixed: it needs an
   embedded Unicode font *and* a complex-script shaping engine (pdf-lib does no
   Arabic shaping), realistically an HTML→PDF pipeline. Substituting a
   placeholder for unencodable characters was rejected — silently altering a
   customer name on a tax document is worse than failing.
3. **Mandatory end-to-end flow cannot complete (M-501).** It terminates in
   "Send WhatsApp", and WhatsApp has zero code in the repository.

### High

4. **No audit trail outside invoices (M-037).** `AuditEntry` is written at four
   call sites, all invoice artifacts. No record of logins, failed logins,
   logouts, permission denials, password resets, role changes, user deletion,
   certificate issuance or plan changes. For compliance software that cannot
   answer "who did what, when", this is a real gap. Not fixed: doing it properly
   needs a migration (actor/tenant columns), a query surface and UI. Writing rows
   nothing can read would make the gap *look* closed.
5. **No observability (A-068…A-083).** No structured logging, error tracking,
   metrics, correlation IDs or alerting; 28 raw `console.*` call sites. A health
   check exists and works.
6. **No AI cost or usage tracking (M-330, M-346, M-347).** Combined with F-11
   below, unbounded spend with zero visibility.

---

## 7. Open risks, recorded and not fixed

| # | Risk | Why not fixed |
|---|---|---|
| F-10 | `confirmedAction` is a client-trusted flag in the AI agent | RBAC + zod still enforced underneath; needs a server-minted token (already on the project backlog) |
| F-11 | Any tenant owner can force a global RAG re-index | Cross-tenant blast radius from a per-tenant permission; needs an operator credential |
| F-12 | CSRF check skipped when Origin and Referer are both absent | Not browser-reachable; `SameSite=Lax` independently covers the case |
| F-13 | Password-reset email unconfigured by default | `RESEND_API_KEY` is optional and commented out in `.env.example` |
| F-14 | Reset URL built from a request header, not `appUrl()` | Exfiltration blocked by the CSRF check; correctness issue |
| F-15 | `APP_URL` required by checkout but absent from `.env.example` | Fresh deployments have a dead checkout |
| F-16 | Invalid UTF-8 in a URL yields a framework-level 500 | Fails inside Next.js before application code; no internals disclosed |
| — | Model misstates its own scope | Answered "Customer List (All Tenants)" while showing one tenant. No leak, but a compliance assistant asserting a false scope is a trust problem |
| — | `validateInvoice` runs only at submission, never at issuance | A standard invoice with no buyer VAT is signed and consumes an ICV slot, then can never clear. Changing it alters which invoices the product accepts and breaks the AI tool — a product decision |

---

## 8. HUMAN DECISION REQUIRED

1. **VAT return scope.** `/api/reports` counts only `cleared`/`reported`
   invoices. An issued-but-not-yet-cleared invoice — a B2C invoice inside its
   24-hour window, or any invoice during a gateway outage — is a taxable supply
   but is **absent from the VAT return**. This is a tax-scope decision, not an
   engineering one, and was deliberately left unchanged.
2. **Invoice validation strictness** (see §7, last row).
3. **Pricing.** `PRO_PRICE_HALALAS` remains an explicit placeholder.

## 9. Blocked on owner credentials (the 9 UNKNOWN items)

- Fatoora portal OTP → M-189, M-190, M-191, M-196, M-226
- Neon console → M-446, M-447 (PITR enablement, backup encryption)
- No failed-migration drill performed → A-203
- Moyasar merchant account → payment path never exercised live

---

## 10. Not verified — stated plainly

- No live ZATCA submission of any kind.
- No load test beyond 8 concurrent issuers; no 100-tenant scale test.
- No browser-level UI testing; UX items were assessed through the API and the
  project's prior product audit.
- No Neon PITR restore (the DR drill was application-level).
- Moyasar webhook never exercised against a real transaction.

---

## 11. Production readiness

**NOT READY.**

The security foundation — authentication, authorization, tenant isolation,
licensing, invoice integrity, cryptographic chaining — is verified and, on the
evidence gathered here, genuinely strong. The financial engine is now correct
after two real defects were fixed.

It is not ready because a ZATCA e-invoicing product that has never completed a
ZATCA round trip has not demonstrated the thing it exists to do, and because a
Saudi invoicing product cannot produce an Arabic invoice PDF.

Recommended order:

1. Obtain the Fatoora portal OTP; complete a sandbox round trip end to end.
2. Fix Arabic PDF rendering (font embedding + shaping, or an HTML→PDF pipeline).
3. Decide the VAT return scope question in §8.
4. Add the security/actor audit trail.
5. Add error tracking and structured logging.
6. Add AI usage accounting and per-tenant limits.
7. Then re-run this audit's adversarial suites before declaring readiness.

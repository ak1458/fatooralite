# Decision register — Fatoora Lite Pro remediation

Nine decisions: eight surfaced by the 2026-08-18 production audit, plus D9
(surfaced during Phase 3/N8 implementation, same day). **None has been
implemented.** Each carries a recommendation; behaviour changes only on written
owner approval.

Status key: OPEN (awaiting owner) · APPROVED · REJECTED · DEFERRED.

---

## D1 — VAT-return scope · **APPROVED — Option C** · needed for Phase 1

**Owner decision (2026-08-19):** Option C — report both the "declarable"
(every issued, non-draft invoice — the tax point) and "cleared" (cleared/
reported by ZATCA only) figures side by side, clearly labelled. Implemented:
`GET /api/reports` now returns `declarable`/`cleared` blocks (legacy
top-level `totalTaxable`/`totalVat`/`totalInvoices` kept, unchanged meaning,
for existing consumers); the CSV export lists every non-draft invoice with
two labelled total rows; the AI assistant's `getReport` tool returns the
same two-figure shape. Both figures are net of credit/debit notes (D9).
Tests: `app/api/reports/route.test.ts` (existing, unchanged, still green),
`lib/services/credit-note.test.ts` (new assertion). Still confirm with a
qualified Saudi tax adviser before filing from either figure — this
implements the register's recommendation, it does not substitute for that
review.

**QUESTION**
Should the VAT return include invoices that have been *issued* but not yet
cleared or reported by ZATCA?

**CURRENT BEHAVIOUR**
`app/api/reports/route.ts` filters `status: { in: ["cleared", "reported"] }`.
An issued, signed invoice that is still `signed` or `submitted` — or that was
`rejected` — contributes nothing to `totalTaxable`, `totalVat` or the CSV export.

**WHY IT MATTERS**
Three ordinary situations put a genuine taxable supply outside the return:

1. A B2C simplified invoice sits `pending` for up to 24 hours by design before
   the reporting cron drains it.
2. Any invoice issued during a ZATCA gateway outage.
3. Any tenant signing with a local certificate, which cannot clear at all — the
   state every tenant is in before completing ZATCA onboarding.

If the figure is used to file, output VAT is under-declared. If it is only an
internal dashboard, it is merely misleading.

**AUTHORITATIVE BASIS**
Saudi VAT sets the *time of supply* (tax point) as the **earliest** of: goods or
services delivered, tax invoice issued, or payment received. Output VAT is
declared in the tax period containing that event. Nothing in the time-of-supply
rules makes the tax point contingent on any clearance or approval action by the
authority — clearance is an e-invoicing transmission obligation, a separate duty
from the declaration obligation. See sources at the foot of this file.

On that basis the current filter is **very likely wrong** for a VAT return: it
conditions a declaration on a transmission status.

**OPTIONS**

| | Option | Consequence |
|---|---|---|
| A | Include every issued invoice (`draft` excluded), regardless of ZATCA status | Matches the tax point. Figures rise; the return becomes filing-grade |
| B | Keep the current filter | Under-declares in the three cases above |
| C | Report both figures side by side — "declarable" and "cleared by ZATCA" — and label them | Correct *and* preserves the compliance-status view. Larger UI change |
| D | Keep the filter but rename the screen to "ZATCA clearance summary" and state plainly it is not a VAT return | Cheapest honest fix; no VAT return feature until later |

**RECOMMENDATION — Option C, with A as the fallback.**
A VAT-return figure should follow the tax point; a clearance figure is genuinely
useful too, and today's number is that second thing wearing the first one's
label. If C is too large now, do A and keep a separate clearance view. Confirm
with your tax adviser before filing anything from this screen — I am not a
substitute for that.

**ENGINEERING IMPACT**
A: one-line `where` change plus tests. C: adds a second aggregate, an API field
and a UI label change. Both are small; the risk is entirely in getting the
*policy* right, which is why it is here.

**IF DEFERRED**
The screen keeps producing a number that looks like a VAT return and is not one.
Nothing else is blocked. Reports stay unchanged; no silent alteration will occur.

---

## D2 — Tax-period closing/locking · **APPROVED — Option B** · Phase 3

**Owner decision (2026-08-19):** Option B — a soft, non-blocking warning
only; no period lock (Option C stays not chosen). Implemented:
`lib/time/riyadh.ts`'s `isPastReportingPeriod()` flags an `issueDate` whose
calendar month has already elapsed (Riyadh time); `POST /api/invoices`
attaches a `warnings` array to its response when true, issuance still
succeeds (201) either way. Tests:
`app/api/invoices/past-period-warning.test.ts` (new — proves no warning in
the current month, a warning-but-still-201 for a back-dated month).

**QUESTION** Should a filed VAT period be lockable, preventing new or amended
invoices from being dated into it?

**CURRENT BEHAVIOUR** No concept of a closed period (M-283). An invoice can be
issued with any past `issueDate`, which after the F-18 fix lands it in that past
period and changes a figure that may already have been filed.

**WHY IT MATTERS** Retroactive changes to a filed period are exactly what an
audit trail and a period lock exist to prevent. Credit notes — not back-dated
invoices — are the correct mechanism for correcting a filed period.

**AUTHORITATIVE BASIS** General VAT practice; ZATCA defines credit/debit notes as
the correction mechanism. No specific citation gathered — flag for tax adviser.

**OPTIONS** (A) no locking; (B) soft warning when dating into a past period;
(C) hard lock per period with an explicit unlock action, audited.

**RECOMMENDATION** B now, C when N8 (credit/debit flows) lands. A hard lock
before credit notes work end to end would leave users with no correction path.

**ENGINEERING IMPACT** B is small. C needs a `TaxPeriod` table, an admin action
and audit events (depends on W2).

**IF DEFERRED** Filed figures remain silently mutable. Risk grows once real
customers file.

---

## D3 — Commercial model / pricing · **APPROVED — manual onboarding, checkout stays OFF** · Phase 2

**Owner decision (2026-08-19):** self-serve paid checkout stays OFF; first
customers are onboarded manually. No final price invented or set.

**Verified, no code change needed:** `PRO_PRICE_HALALAS` in
`lib/billing/entitlements.ts` is unchanged (still 149 SAR/month, explicitly
commented as a placeholder) and there is no checkout route anywhere under
`app/` today (`grep -r MOYASAR|checkout app/` — zero matches) — this
decision's chosen state was already the actual state, confirmed rather than
assumed. Still gated on the Phase 7 (product-roadmap numbering — market
research, `docs/17-market-analysis.md`, not yet written) research this
register's original entry already named.

**QUESTION** Final Pro price, whether an annual plan exists, and the limit set.

**CURRENT BEHAVIOUR** `PRO_PRICE_HALALAS = 14_900` (149 SAR/month), documented
in code as a placeholder. Trial = 25 invoices / 1 branch / 2 seats. No annual
plan, no coupons.

**WHY IT MATTERS** Checkout cannot go live against a placeholder. Moyasar is
integrated and inert.

**AUTHORITATIVE BASIS** None — commercial. Gated on the Phase 7 market research
already in `START-HERE.md`.

**OPTIONS** Ship monthly-only at a researched price; add annual with a discount;
defer checkout and onboard the first customers manually.

**RECOMMENDATION** Manual onboarding for the first cohort, price settled from
the market research before checkout is enabled. Tier *boundaries* are one table
in `entitlements.ts` and cheap to move; the price is the researched part.

**ENGINEERING IMPACT** Price is a constant. An annual plan needs a second
Moyasar product and a period calculation. Small to medium.

**IF DEFERRED** No paid self-serve signup. Trial and manual onboarding still work.

---

## D4 — Legal copy · **APPROVED — Option A, drafted, still unreviewed** · Phase 2

**Owner decision (2026-08-19):** Option A — draft the legal pages from the
product's actual functionality/data practices, keep the DRAFT banners
until qualified legal counsel reviews them. Not represented as legally
approved anywhere.

**Delivered:** every remaining `[Placeholder: ...]` block across the seven
legal pages replaced with substantive draft text grounded in this
codebase's actual data model, security posture, and features (`app/terms`,
`app/privacy`, `app/refund-policy`, `app/cancellation-policy`,
`app/data-retention`, `app/acceptable-use` — `app/cookie-policy` already
had none). Each page's DRAFT banner is kept and reworded to say what's
actually true now: drafted from real product facts, but **not reviewed by
counsel**. Two things deliberately still left unset rather than invented,
each flagged in place: the refund window in `refund-policy` (no payment
processor is integrated — D3 keeps checkout OFF; publishing a number ahead
of an approved commercial policy would bind the business to a figure no
one chose) and the exact Saudi VAT record-retention period in
`data-retention` (a tax-law fact, same "flag for a qualified adviser" class
as D1/D9's own sourcing notes, not something to guess at). A privacy
contact address is likewise left as an explicit operational TODO rather
than invented.

**Still blocked on the owner:** commissioning actual qualified legal
review remains the real gate on public launch (unchanged from this
register's original text) — drafting substantive text is not a substitute
for that review, and none of these pages should be read as legally
sufficient. No code logic changed; this is content-only, matching the
original "ENGINEERING IMPACT: Content only. No code." assessment.

**QUESTION** Who supplies reviewed text for `/terms`, `/privacy`,
`/refund-policy`, `/cancellation-policy`, `/data-retention`, `/acceptable-use`?

**CURRENT BEHAVIOUR** All present, all carrying DRAFT banners with bracketed
placeholders.

**WHY IT MATTERS** Publishing draft legal text with placeholders to paying Saudi
customers is a liability, and the pages are already publicly routable.

**AUTHORITATIVE BASIS** Saudi PDPL applies to customer personal data. Requires
qualified review — not an engineering judgement.

**OPTIONS** Commission review; adapt vetted templates; keep DRAFT banners and
delay public launch.

**RECOMMENDATION** Commission review before any public signup. Until then keep
the banners — they are honest, and removing them without review would be worse
than leaving them.

**ENGINEERING IMPACT** Content only. No code.

**IF DEFERRED** Public launch blocked. Private/manual onboarding is unaffected.

---

## D5 — Hybrid vs standalone architecture evaluation · **APPROVED — Option A** · Phase 4

**Owner decision (2026-08-19):** Option A — write the ADR. Delivered:
`docs/audit/adr-001-hybrid-architecture.md`. Documentation only, as scoped;
no architecture changed. (Phase 4's session declined this same shortcut
unilaterally despite its low engineering impact — recorded here because
this session had explicit, current owner sign-off, which that one didn't.)

**QUESTION** Record the architecture decision the product already embodies.

**CURRENT BEHAVIOUR** Unambiguously a hybrid web SaaS (Next.js on Vercel + Neon).
Master Audit §32 asks for a written evaluation of the alternative; none exists
(M-601…M-616).

**WHY IT MATTERS** Only for defensibility. The audit found **no architectural
reason to change** — and specifically **no reason to migrate Neon to Supabase**.
Tenant isolation, licensing enforcement, patching and central management all
tested well precisely *because* the server is controlled.

**AUTHORITATIVE BASIS** N/A.

**OPTIONS** Write the evaluation; skip it.

**RECOMMENDATION** Write a short ADR recording the decision and its reasoning.
Do not reopen the architecture.

**ENGINEERING IMPACT** Documentation only.

**IF DEFERRED** 16 ledger items stay MISSING for a decision that is in fact made.

---

## D6 — Postgres RLS as defence in depth · **APPROVED — Option C, PARTIAL this session** · Phase 3

**Owner decision (2026-08-19):** Option C — RLS on Invoice/Customer/Product/
Certificate only, not every table.

**Honest scope: the mechanism is built and adversarially tested; it is not
yet adopted anywhere in the app's actual runtime.** The original
recommendation was "after W17 separates production from development" —
that separation is still X2/owner-blocked, `neondb` is still the shared
dev/demo database. Applying this in a way that actually protects live
traffic requires either (a) that separation, or (b) migrating every
existing query call site onto the RLS-scoped path in one coordinated
change — both explicitly out of a single session's safe scope. What was
done instead, staying strictly inside what's safe on shared infrastructure:

- `prisma/migrations/20260819100000_row_level_security` — creates a
  NOLOGIN Postgres role (`fatoora_rls_app`) and RLS policies on the four
  tables. Deliberately does **not** set `FORCE ROW LEVEL SECURITY` on the
  owner role every existing query (and this entire 575-test suite) already
  connects as — doing so would have made every unmigrated query return
  zero rows the instant the migration landed, breaking the whole
  application, not just adding a safety net. RLS applies automatically to
  the new non-owner role instead; the owner role, and everything using it,
  is provably unaffected (see `lib/db/rls.test.ts`'s last test).
- `lib/db/rls-client.ts` — an explicit, opt-in `queryAsTenant(companyId, fn)`
  helper (not a transparent wrapper around the main `prisma` client — see
  the file header for why: nesting into `issueInvoice()`'s own chain-
  critical interactive transaction was judged too risky to attempt this
  session).
- `lib/db/rls.test.ts` — adversarial proof: an unfiltered `findMany()` with
  no `where` clause at all, run through the scoped role, still cannot see
  another tenant's rows; switching tenants switches visibility; a
  wrong-tenant insert is refused by the policy, not silently mis-attributed;
  the main app connection is unaffected. Applied only to `fatoora_audit`,
  never `neondb`, per this programme's standing rule.

**Not done, and not claimed done:** wiring `queryAsTenant` into any real
application read/write path. That is the natural next increment — pick one
low-risk read path first, prove it in production-shaped conditions, then
expand — deliberately not attempted in the same session that built and
tested the primitive.

**QUESTION** Add row-level security beneath the application's tenant scoping?

**CURRENT BEHAVIOUR** Isolation is enforced in application code only (M-016).
The audit attacked it 25 ways and it held.

**WHY IT MATTERS** Today one missed `where companyId` in one new route is a
cross-tenant leak. RLS makes the database refuse it regardless.

**AUTHORITATIVE BASIS** N/A — defence in depth.

**OPTIONS** (A) none — rely on code plus tests; (B) RLS on tenant-scoped tables
with a per-request session variable; (C) RLS on the highest-value tables only
(Invoice, Customer, Product, Certificate).

**RECOMMENDATION** C, after W17 separates production from development. It is
meaningful insurance, but it changes every query path and must not be attempted
while production and dev share one database.

**ENGINEERING IMPACT** Medium-large: policies, a connection-level tenant
setting, and Prisma integration. Real regression risk.

**IF DEFERRED** Isolation stays code-only. Mitigated by the regression suite.

---

## D7 — Customer Control Center launch requirement · **APPROVED — Option C** · needed for Phase 1

**Owner decision (2026-08-19):** Option C — a read-only operator view only;
the full Customer Control Center (Option B) is explicitly NOT authorized.
Implemented: `GET /api/operator/companies` — gated by the same
`OPERATOR_SECRET` bearer-credential pattern W6's global RAG re-index
already established (no tenant session, however privileged, can reach it —
this app still has no platform-admin User role, by design). Returns
license state (plan/status/trial/period), ZATCA status (latest
certificate's kind/status), last-seen (most recent `SecurityEvent` per
company), onboarding status, and reports "version" as `n/a` (single-
deployed-version web app — see the M-098…M-123 N/A block in
`START-HERE.md`). Every read is recorded as a `SecurityEvent` — both a
denied attempt and a successful one — per D7's "audited privileged reads"
requirement. No POST/PATCH exists or is planned; a write path is exactly
the surface Option B (not chosen) would have needed. Tests:
`app/api/operator/companies/route.test.ts` (new — no-credential refused,
forged-token refused, a tenant owner's own session cookie refused, correct
credential succeeds with the scoped fields, both outcomes audited).
N1/N2/N5/N9/N11 (Phase 5, the full Control Center and its dependents) stay
BLOCKED — this does not build them, and building them would still resolve
D7 further than this session's authorization covers.

**QUESTION** Does the absent Customer Control Center block launch?

**CURRENT BEHAVIOUR** Does not exist (M-052…M-074, 23 items). There is
deliberately **no platform-admin role** — `START-HERE.md` records this as a
security decision, and three IDOR fixes depend on *every* role being
tenant-scoped.

**WHY IT MATTERS** Two authorities conflict. The Master Audit lists the Control
Center as a §31 production gate. The codebase treats its absence as a security
property. Building it introduces the first cross-tenant privileged role into a
system whose isolation currently tests clean *because* no such role exists.

**AUTHORITATIVE BASIS** None external. Internal conflict between the audit
specification and a recorded architecture decision.

**OPTIONS**

| | Option | Consequence |
|---|---|---|
| A | Launch without it; support via database access and direct contact | Fastest. Support is manual and unaudited; does not scale past a handful of customers |
| B | Build the full Control Center before launch | 23 items, XL effort, and a new privileged boundary to secure |
| C | Build a **read-only** operator view first (licence state, version, last seen, ZATCA status), no cross-tenant writes | Most support value for the least new attack surface |

**RECOMMENDATION — C, and it does not block the first cohort.**
With a small number of customers, A is survivable; the moment support requires
opening a database console against live data, it is not. C is the smallest thing
that removes that need. Whichever is chosen, it must land **after W2**, so every
privileged read is audited from its first day.

**ENGINEERING IMPACT** A: none. C: medium — a separate operator role, its own
authz path, audited reads. B: XL.

**IF DEFERRED** Support means direct database access — the exact activity the
missing audit trail (W2) cannot record.

---

## D8 — WhatsApp launch scope · **APPROVED — Option A** · needed for Phase 1

**Owner decision (2026-08-19):** Option A — WhatsApp invoice delivery IS
required for launch. Not replaced by email (N7) merely because N7 already
exists.

**Delivered, everything that can be built without owner-only external
setup:** `lib/whatsapp/send.ts` (WhatsApp Business Cloud API — Meta —
document media upload followed by an approved-template message referencing
it, since Meta requires a pre-approved template for any business-initiated
message outside the 24h customer-service window); `POST /api/invoices/:id/
whatsapp` (mirrors N7's `/send` exactly on the design decision that
matters: the recipient comes exclusively from the invoice's linked
`Customer.phone`, never the request body); a `whatsappInvoiceDelivery`
feature flag (default OFF — this cannot do anything real until the owner
action below happens); `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/
`WHATSAPP_INVOICE_TEMPLATE_NAME` env vars (all optional — unset means a
mock/logged send, same "never crash" posture as `RESEND_API_KEY`). Tests:
`lib/whatsapp/send.test.ts` (6, injected-fetch, deterministic, never calls
the real Graph API), `app/api/invoices/[id]/whatsapp/route.test.ts` (9,
mocked send module, real DB).

**BLOCKED ON OWNER, cannot be simulated further:** a Meta Business account,
phone-number registration, and — specifically — approval of an actual
message template naming real invoice-delivery copy. Nothing in this
session can obtain that; `WHATSAPP_INVOICE_TEMPLATE_NAME` names whatever
template the owner gets approved, once approved. **No production WhatsApp
send has been verified** — only the mock path and the injected-fetch unit
tests. Do not read "9 tests pass" as "WhatsApp delivery works in
production"; it proves the code path is correct against Meta's documented
API shape, not that a real message has ever been sent.

**Phase 6 (X4, mandatory E2E) still cannot close even with this decided.**
X4 depends on X1 (a real ZATCA round trip) *and* D8. This resolves the D8
half; X1 remains owner-blocked exactly as before (docs/audit/
remediation-ledger.md's Phase 6 & Phase 7 outcome section, 2026-08-19). The
Master Audit's mandatory E2E flow already terminates in "Send WhatsApp"
(M-501) — Option A does not require rewriting that flow's definition (the
B-flavoured amendment the original recommendation would have needed is now
moot).

**QUESTION** Is WhatsApp invoice delivery required for launch?

**CURRENT BEHAVIOUR** **Zero code in the repository** (M-299…M-313, 16 items).

**WHY IT MATTERS** Three separate reasons:

1. It was in the original Fatoora Lite requirements and the intended customer
   workflow, and the roadmap treats it as a differentiator.
2. The Master Audit's **mandatory end-to-end flow terminates in "Send
   WhatsApp"** (M-501). As written that flow **cannot pass**, so the final
   production gate is unreachable until this is decided.
3. There is currently **no delivery channel at all** — no WhatsApp and no email
   invoice delivery (M-260). A customer can produce an invoice PDF and has no
   in-product way to send it.

Point 3 is the one that matters most and is easy to miss: this is not "a nice
integration is missing", it is "the product cannot deliver its output".

**AUTHORITATIVE BASIS** Product requirement, not regulatory. ZATCA does not
mandate a delivery channel; it mandates clearance/reporting and that the buyer
receives the invoice.

**OPTIONS**

| | Option | Consequence |
|---|---|---|
| A | Build WhatsApp Business API before launch | Matches the original requirement and the E2E flow. L effort, needs a Meta business account and template approval — itself an external dependency with lead time |
| B | Ship email delivery (N7) for launch, WhatsApp post-launch | Small effort, Resend already integrated. Customers can deliver invoices. E2E flow must be formally amended |
| C | Neither — manual download and send | Leaves point 3 unresolved |

**RECOMMENDATION — B, and amend the E2E definition explicitly.**
Email delivery is small, uses an integration already present, and removes the
"cannot deliver its output" problem. WhatsApp then becomes a Phase 3 feature
driven by customer demand rather than a launch blocker — and its Meta approval
lead time stops sitting on the critical path. If WhatsApp is contractually
promised to anyone, that changes the answer to A.

**ENGINEERING IMPACT** B: small (N7, ~S, plus opt-in handling). A: large (N3, L)
plus external onboarding. Either way the E2E flow text must be updated to match
whatever is decided, rather than left permanently failing.

**IF DEFERRED** M-501, M-600, M-722 and X4 stay FAILED/BLOCKED, and the final
production gate cannot close.

---

## D9 — Credit/debit note amount sign & reconciliation · **APPROVED — Option B** · needed to close N8

**Owner decision (2026-08-19):** "the safest practical implementation" —
evaluated B against C before implementing, per the owner's explicit
instruction not to combine them or default to A.

**B vs C, evaluated against the actual codebase (not in the abstract):**
Option C (a separate sign-adjusted `netEffect` column/view) would need a new
migration, a backfill decision for the credit notes already seeded during
Phase 3/5 testing, and — critically — every aggregation site would *still*
have to remember to read the new column instead of the raw one, which is
the exact same "forgettable branch" risk B carries, just moved to a
different field name. It buys isolation of the stored representation at the
cost of a schema change this decision doesn't need. Option A (store
negative amounts) was ruled out per the owner's explicit instruction unless
architecturally necessary — it isn't: `createInvoiceSchema` and the W11
CHECK constraints already require positive line amounts unconditionally,
and loosening either is a real, separate risk surface this fix doesn't need
to open.

**Chosen: Option B**, with the shared-helper mitigation the original
register entry already named as the concrete follow-up. Implemented:
`lib/zatca/reconciliation.ts` (`netSign`/`netEffect`/`sumNet` — the ONE
place the sign decision lives) plus the three real call sites that actually
aggregate across invoices (corrected from this entry's original list, which
named `lib/services/reconcile-service.ts`; grepped and confirmed that file
never aggregates `taxableAmount`/`vatAmount` at all — it manages ZATCA
resubmission retries, not reconciliation totals): `app/api/reports/route.ts`,
`lib/services/clearance-stats.ts` (`computeClearanceStats`, also used by
the AI assistant's `getComplianceStats`), and `lib/ai/tools.ts`'s own
`getReport` handler. No schema or migration change. Tests:
`lib/zatca/reconciliation.test.ts` (new, pure unit), a new case in
`lib/services/clearance-stats.test.ts`, and a new end-to-end assertion in
`lib/services/credit-note.test.ts` proving a real credit note nets a real
invoice to zero through `GET /api/reports` against `fatoora_audit`.

**QUESTION**
When a credit or debit note is issued, should its `taxableAmount`/`vatAmount`
be stored (and read back everywhere they're aggregated) as a **negative**
correction to the original invoice, or as a **positive** figure that some
separate, `documentType`-aware aggregation step subtracts or adds at read
time? Either is a legitimate implementation of the same accounting fact —
this register exists to pick one on purpose rather than leave it as an
accident of what N8's schema change happened to touch.

**CURRENT BEHAVIOUR**
Confirmed while implementing N8 (Phase 3): a credit note goes through the
exact same `issueInvoice()` → `invoiceTotals()` pipeline as an ordinary
invoice (`lib/services/invoice-service.ts`, `lib/zatca/money.ts`). Nothing in
that pipeline reads `documentType`. Concretely:

- `lib/validation/schemas.ts` (`createInvoiceSchema`) requires
  `quantity: z.number().positive()` and `unitPrice: z.number().min(0)`
  unconditionally — a credit note's own line amounts are always **positive**
  going in, credit note or not.
- `prisma/migrations/20260818160000_check_constraints/migration.sql` enforces
  the same thing at the database level: `CHECK ("quantity" > 0)`,
  `CHECK ("unitPrice" >= 0)` on `InvoiceLine`. Even an app-layer change to
  send negative amounts would be rejected by Postgres today.
- `app/api/reports/route.ts:91-92` (the VAT return) sums
  `taxableAmount`/`vatAmount` across every matched invoice with a plain `+=`,
  with no `documentType` filter and no subtraction. A credit note for a
  returned sale currently **inflates** the VAT return for its period instead
  of reducing it.
- Nothing in `lib/services/reconcile-service.ts`, `lib/services/
  clearance-stats.ts`, or the AI assistant's compliance-stats tool branches on
  `documentType` either — confirmed by grep, zero matches in both files.

The one thing N8 did add (this same session) is a **queryable link**:
`Invoice.referencedInvoiceId`/`billingReferenceId`/`instructionNote`, so a
credit note's relationship to the invoice it corrects is no longer only
readable by parsing XML text. That's necessary for whichever option below is
chosen, but doesn't itself decide the sign question.

**WHY IT MATTERS**
A VAT return that only ever adds is wrong the first time a real customer
issues a credit note for a return or pricing correction — which the roadmap
itself calls "routine" business (`remediation-roadmap.md`'s N8 row: "real
businesses issue credit notes routinely"). This isn't a cosmetic gap; it
overstates VAT owed to ZATCA using this product's own numbers.

**AUTHORITATIVE BASIS**
ZATCA's e-invoicing rules require a credit/debit note to reference the
original invoice and state its effect (`InvoiceTypeCode` 381/383, which N8's
XML layer already emits correctly) — that part is settled and unaffected by
this decision. What ZATCA does **not** prescribe is this product's internal
storage/aggregation convention for getting from "a signed 381 document exists"
to "the VAT return total is correct." No specific ZATCA or GAZT citation
gathered for the storage convention itself — flag for a Saudi tax adviser
alongside D1, since both bear on what the VAT return legitimately contains.

**OPTIONS**

| | Option | Consequence |
|---|---|---|
| A | Store credit/debit note `taxableAmount`/`vatAmount`/`grandTotal` as negative on the Invoice row itself | Every existing `+=` aggregation (reports, dashboards, AI compliance stats) becomes correct for free, with zero call-site changes. Requires loosening the Zod schema and the W11 CHECK constraints to allow negative totals **only** when `documentType != 'invoice'` — a conditional CHECK constraint, more complex than the current unconditional one, and a real behaviour change to a migration already shipped this phase |
| B | Keep line/total amounts positive always; make every aggregation site `documentType`-aware (subtract for `credit`, add extra for `debit`) | No constraint/schema changes. Every current and future aggregation query (reports, reconciliation, dashboards, AI tools, anything added later) must remember to branch on `documentType` correctly — an easy rule to forget once, and each forgetting silently re-introduces this exact bug in a new place |
| C | Neither — leave `Invoice.taxableAmount` etc. as the line-level truth, add a separate `netEffect` (or similar) column/view that's already sign-adjusted, used only by aggregation call sites | Isolates the sign decision to one place; original line amounts stay simple and auditable. New column, new backfill question for the two credit notes seeded during this phase's own testing |

**RECOMMENDATION — B, revisit as A once real transaction volume justifies the
constraint change.**
B ships with no schema/constraint change, on top of the CHECK constraints
already deployed this phase, and the fix is small (four call sites currently:
`app/api/reports/route.ts`, `lib/services/reconcile-service.ts`,
`lib/services/clearance-stats.ts`, `lib/ai/tools.ts`'s `getComplianceStats`).
The real risk B carries — a fifth call site added later that forgets the
branch — is exactly what a **shared aggregation helper** (not written this
phase) neutralizes: one `netVat(invoices)`-style function every call site
uses, rather than four independent `+=` loops. That helper is the concrete
follow-up this decision unlocks, not something to build speculatively ahead
of the owner's sign-off on B itself.

**ENGINEERING IMPACT**
B: small (S) — a shared aggregation helper plus four call-site updates, no
migration. A: medium (M) — a new conditional CHECK constraint migration, a
Zod schema change, and an audit of every existing negative-amount rejection
path (BR-KSA-22 in `lib/zatca/validate.ts` also assumes `unitPrice >= 0`
unconditionally today). C: medium (M) — new column/view plus a backfill
decision for existing note rows.

**IF DEFERRED**
The VAT return stays wrong for any tenant that issues a credit or debit note,
silently, with no error or warning anywhere in the product — this is the
concrete, currently-live consequence, not a hypothetical one. N8's own
ledger status should read PARTIAL (link + XML + tests done; totals-correctness
not) until this is decided and implemented.

---

## Sources (D1)

- [ZATCA — Value Added Tax](https://zatca.gov.sa/en/RulesRegulations/VAT/Pages/default.aspx)
- [ZATCA — E-Invoicing Detailed Guideline v2](https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-Invoicing_Detailed__Guideline.pdf)
- [Understanding the Time of Supply for VAT in Saudi Arabia](https://quickdiceerp.com/blog/time-of-supply-for-vat-in-saudi-arabia)
- [Grant Thornton — Indirect tax, Saudi Arabia](https://www.grantthornton.global/en/insights/indirect-tax-guide/indirect-tax---Saudi-Arabia/)

The time-of-supply position above is drawn from these; **confirm with a
qualified Saudi tax adviser before filing from any figure this product produces.**

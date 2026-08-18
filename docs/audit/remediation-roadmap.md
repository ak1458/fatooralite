# Remediation roadmap — Fatoora Lite Pro

Derived from the 2026-08-18 production audit. Covers **all 506 unresolved audit
items**, grouped into 26 engineering work items (W), 11 product features (N),
4 external tracks (X) and 8 decisions (D). Nothing from the ledger is dropped.

Programme rule: **PLAN EVERYTHING → EXECUTE ONE PHASE → TEST → VERIFY →
UPDATE LEDGER → STOP.** Live status lives in `remediation-ledger.md`.

Complexity is expressed in relative engineering effort:
S = under a day · M = 1–3 days · L = ~1 week · XL = multi-week.

---

## PHASE 1 — Production blockers / immediate engineering fixes

| Work item | Audit items | Pri | Depends on | Risk | Cplx | Launch impact | Status |
|---|---|---|---|---|---|---|---|
| **W1** Arabic invoice PDF | 19 (M-218, M-257, M-262, M-595, M-714, A-166, A-167, A-185…A-195, A-341) | P0 | D-none | Font licensing; shaping correctness; serverless bundling of a font asset | M | **BLOCKS LAUNCH** — a Saudi invoicing product that cannot render an Arabic invoice | IN PROGRESS |
| **W2** Security/actor audit trail | 4 (M-037, M-507, A-034, A-044) | P0 | none | Schema migration on a live table; log volume; must not capture secrets | M | **BLOCKS LAUNCH** — compliance software must answer "who did what, when" | IN PROGRESS |
| **D1** VAT-return scope | 1 (M-427) | — | Owner | Changing tax scope without basis | S (analysis) | Gates any change to reports | ANALYSIS ONLY |
| **D7** Control Center launch requirement | 1 (M-598) | — | Owner | Conflicts with the no-platform-admin decision | S (analysis) | Gates N1 | ANALYSIS ONLY |
| **D8** WhatsApp launch scope | — (gates M-501/M-600/M-722) | — | Owner | Mandatory E2E cannot pass without a decision | S (analysis) | Gates N3 and X4 | ANALYSIS ONLY |

D1/D7/D8 are analysed in Phase 1 because W1, W2 and the E2E definition would
otherwise be built on assumptions. **No behaviour changes from them without
written approval.**

---

## PHASE 2 — High-risk correctness and reliability

| Work item | Audit items | Pri | Depends on | Risk | Cplx | Launch impact | Status |
|---|---|---|---|---|---|---|---|
| **W3** Idempotency + submission reconciliation + retry policy | 12 (A-008, A-009, A-012, A-045, A-050, A-252, A-254, A-258, A-291, A-308, M-202, M-719) | P1 | W2 (reconciliation events should be audited) | Touches the ZATCA submission path — the highest-consequence code in the product | L | High — completes the crash-window work only narrowed in the audit | PLANNED |
| **W4** Observability | 20 (M-465…M-469, A-068…A-083, A-334) | P1 | none | Log volume/cost; must not log secrets or tenant PII | M | High — nothing is diagnosable in production without it | PLANNED |
| **W5** Server-minted AI confirmation tokens | 1 (A-303) | P1 | none | Low; RBAC already the real boundary | S | Medium — closes F-10 | PLANNED |
| **W6** Restrict global RAG re-index + AI usage accounting | 3 (M-051, A-128, A-129) | P1 | none | Low | S | Medium — closes F-11, bounds AI spend | PLANNED |
| **W7** Deployment configuration correctness | 1 (M-004) | P1 | none | Low | S | Medium — checkout is dead on a fresh deploy without APP_URL | PLANNED |
| **W26** Close remaining RISK findings | 1 (M-721) | P1 | W5, W6 | Low | S | Roll-up of F-10/F-11/F-12/F-16 | PLANNED |

---

## PHASE 3 — Important production readiness

| Work item | Audit items | Pri | Depends on | Risk | Cplx | Launch impact | Status |
|---|---|---|---|---|---|---|---|
| **W8** Background job substrate | 31 (M-428…M-444, A-054…A-067) | P2 | W4 | Introducing a queue changes failure modes | L | Medium | PLANNED |
| **W9** Asia/Riyadh business-timezone policy | 8 (A-172…A-177, A-182, A-184) | P2 | none | Changing date boundaries affects reported figures | M | Medium — compliance-adjacent | PLANNED |
| **W10** branchId scoping (PRD FR5) | 12 (M-502…M-514) | P2 | none | Adding a filter can hide existing data if wrong | M | Medium | PLANNED |
| **W11** DB CHECK constraints + orphan detection | 1 (A-101) | P2 | none | A constraint can reject existing rows | S | Low-Medium | PLANNED |
| **W12** ZATCA XSD/Schematron validation | 1 (M-205) | P2 | X1 (rules should be confirmed against the live spec) | Stricter validation may reject invoices currently accepted | M | Medium — compliance | PLANNED |
| **W13** Migration safety drills | 15 (A-199…A-213, A-342) | P2 | none | Drills run against copies only | M | Medium | PLANNED |
| **W14** Performance/scalability testing | 22 (M-497, M-498, A-114…A-134, A-337) | P2 | W4 | None (measurement) | M | Medium | PLANNED |
| **W15** Reachable-domain test coverage | 17 (M-476…M-500) | P2 | W1, W2 | None | M | Medium | PLANNED |
| **W16** Failure-injection harness | 7 (A-316, A-317, A-318, A-324, A-326, A-333, A-347) | P2 | W3, W8 | None (test-only) | M | Medium | PLANNED |
| **W17** DevOps staging/patch process | 12 (M-458…M-475) | P2 | none | Production/dev share one Neon database today — separating them is the real work | M | **Medium-High** — a seed or reset can destroy live data while they share a DB | PLANNED |
| **W18** Stop the assistant asserting unsupported scope | 2 (A-305, A-307) | P2 | none | Low | S | Medium — trust | PLANNED |

---

## PHASE 4 — Non-blocking production hardening

| Work item | Audit items | Pri | Depends on | Risk | Cplx | Launch impact | Status |
|---|---|---|---|---|---|---|---|
| **W19** Session refresh/rotation | 1 (M-006) | P3 | none | Session changes can log users out | M | Low | PLANNED |
| **W20** Documentation reconciliation | 21 (M-167…M-187) | P3 | W1…W18 | None | M | Low | PLANNED |
| **W21** Require Origin on state-changing requests | 1 (A-141) | P3 | none | Could break non-browser API clients | S | Low | PLANNED |
| **W22** Sequence-gap surfacing + Arabic search/sort validation | 3 (A-030, A-197, A-198) | P3 | W1 | Low | S | Low | PLANNED |
| **W23** Incident-response runbook | 15 (A-084…A-097, A-335) | P3 | W2, W4 | None (process) | S | Low-Medium | PLANNED |
| **W24** Dependency advisories / transformers decision | 1 (M-036) | P3 | D-none | Dropping the local embedding provider changes AI behaviour | S | Low | PLANNED |
| **W25** Backup procedures beyond the drill | 10 (M-445…M-457) | P2 | X2 | None | S | Medium | PLANNED |

---

## PHASE 5 — Product / post-launch features

**These are not "post-launch forever".** Each carries its own launch-required
judgement; N3 in particular is contested and is decision D8.

| Feature | Audit items | Business value | Security/compliance impact | Required for launch? | Depends on | Cplx | Recommended phase |
|---|---|---|---|---|---|---|---|
| **N1** Customer Control Center | 23 (M-052…M-074) | High — no way to support or manage customers today | **Introduces a cross-tenant privileged role.** Three IDOR fixes rest on every role being tenant-scoped; a platform admin must be designed as a deliberate, audited boundary | **Contested — decision D7** | W2 (must be audited from day one) | XL | 5, unless D7 says otherwise |
| **N2** Support ticketing + KB | 18 (M-556…M-573) | Medium — email/WhatsApp can carry early support | Low | No | N1 | L | 5 |
| **N3** WhatsApp integration | 16 (M-299…M-313, M-261) | **High — named in the original requirements and the intended customer workflow; a stated differentiator** | Medium — customer PII leaves the system; opt-in and credential storage matter | **Contested — decision D8.** Blocks the mandatory E2E flow as written | W8 (send should be queued, not synchronous) | L | **2 or 3 if D8 says launch-required**, else 5 |
| **N4** Excel/CSV import | 15 (M-284…M-298) | High — migration from Excel is the main switching path for the target customer | **Creates the first file-upload attack surface.** 13 audit items are currently N/A only because no upload exists | No, but it is a strong adoption lever | W11 (validation), W8 (large imports) | L | 5, early |
| **N5** Support diagnostics report | 17 (A-222…A-237, A-344, M-720) | Medium | Must redact secrets by construction | No | W4, N1 | M | 5 |
| **N6** Feature flags | 9 (A-214…A-221, A-343) | Medium — enables controlled rollout | Must never become a security boundary | No | none | M | 5 |
| **N7** Email invoice delivery | 1 (M-260) | Medium — the fallback if WhatsApp is deferred | Low; Resend already integrated | No — **but becomes important if D8 defers WhatsApp** | W7 | S | 5, or 2 if D8 defers N3 |
| **N8** Credit/debit/refund/cancellation flows | 5 (M-244, A-025…A-028) | High — real businesses issue credit notes routinely | **Compliance-relevant**: ZATCA defines credit/debit note handling; models exist but flows are untested end to end | Probably yes for real customers | W12 | L | **3** — recommend promoting |
| **N9** Operations surfaces | 7 (M-693…M-699) | Medium | Same privileged-role concern as N1 | No | N1, W4 | L | 5 |
| **N10** Remaining integrations | 4 (M-675…M-678) | Low-Medium | Low | No | N7 | M | 5 |
| **N11** Admin job visibility | 1 (A-062…A-064 subset) | Medium | Low | No | W8, N1 | M | 5 |

**Two recommendations that change the default classification:** promote **N8**
(credit/debit notes) to Phase 3 — issuing corrections is ordinary business, and
the flows are modelled but unverified — and treat **N7** as Phase 2 if D8 defers
WhatsApp, so customers have some delivery channel at launch.

---

## PHASE 6 — External verification / owner action

| Track | Audit items | What only the owner can do | Blocks | Status |
|---|---|---|---|---|
| **X1** ZATCA | 48 (M-188…M-226, M-482, M-591, M-661…M-667, M-713) | Fatoora portal OTP → compliance CSID → production CSID → real round trip | Production readiness; X4; W12 | BLOCKED ON OWNER |
| **X2** Neon | 12 (M-446, M-447, M-596, A-238…A-246) | Console access: confirm PITR, backup encryption, platform-level restore | W25 | BLOCKED ON OWNER |
| **X3** Moyasar | 1 (M-531) | Merchant account (KYC + bank), one sandbox transaction | Billing go-live | BLOCKED ON OWNER |
| **X4** Mandatory E2E | 11 (M-501, M-600, M-700…M-707, M-722) | Depends on X1 and on D8 | Final gate | BLOCKED |

**No item here may be marked complete on the basis of code.** Specifically: no
ZATCA production-verification claim until a real round trip has run.

---

## PHASE 7 — Human / business decisions

Full register with QUESTION / CURRENT BEHAVIOUR / WHY IT MATTERS /
AUTHORITATIVE BASIS / OPTIONS / RECOMMENDATION / ENGINEERING IMPACT /
IF DEFERRED is in **`decision-register.md`**.

| ID | Decision | Blocks | Urgency |
|---|---|---|---|
| D1 | VAT-return scope | Any change to `/api/reports` | **Phase 1** |
| D2 | Tax-period closing/locking | W9, N8 | Phase 3 |
| D3 | Commercial model / pricing | Checkout go-live | Phase 2 |
| D4 | Legal copy | Public launch | Phase 2 |
| D5 | Hybrid vs standalone evaluation | Nothing — documentation of a made decision | Phase 4 |
| D6 | Postgres RLS defence in depth | W17 | Phase 3 |
| D7 | Control Center launch requirement | N1 | **Phase 1** |
| D8 | WhatsApp launch scope | N3, X4, E2E definition | **Phase 1** |

---

## PHASE 8 — Final production verification

Runs only after approved remediation completes. Re-executes, at minimum:

full test suite · security regression · tenant-isolation regression (the 25
cross-tenant attacks) · financial regression (reconciliation + VAT engine) ·
ZATCA validation (7/7 local + real round trip from X1) · **Arabic PDF
regression** · AI/RAG regression · tool-calling RBAC regression · concurrency ·
failure injection · disaster recovery · upgrade tests · mandatory E2E.

Then the full 1069-item ledger is reconciled again. Exit condition: no PENDING,
no SKIPPED, no UNACCOUNTED — anything not GREEN carries an explicit documented
reason and owner.

---

## Constraints held across every phase

- `neondb` is never modified. `fatoora_audit` and `fatoora_restore` are never dropped.
- No Neon → Supabase migration; the audit found no architectural reason for one.
- No VAT-return behaviour change without D1 approval.
- No ZATCA production-verification claim without a real round trip.
- No placeholder, transliteration or character substitution in Arabic tax invoices.
- No audit-trail rows written merely to satisfy a checklist.
- No push to `main`.
- No feature built to inflate the GREEN count.

# Remediation ledger — Fatoora Lite Pro

Live status of the remediation programme. **A new session starts here**, then
reads `remediation-roadmap.md` for scope and `decision-register.md` for anything
awaiting the owner.

Source of truth for audit item status remains `2026-08-18-ledger.md`
(1069 items). This file tracks the 26 work items, 11 features, 4 external
tracks and 8 decisions that consume the 506 unresolved ones.

Status: PLANNED · IN PROGRESS · DONE · BLOCKED · OPEN (decisions).

---

## Programme state

| | |
|---|---|
| Current phase | **Phase 5 COMPLETE** (scoped subset — see Phase 5 outcome) |
| Branch | `audit/production-readiness-2026-08-18` |
| Audit baseline | 461 GREEN / 1069 · 363 tests |
| After Phase 1 | 481 GREEN / 1069 · 402 tests, 0 skipped |
| After Phase 2 | see Phase 2 outcome below |
| After Phase 3 | see Phase 3 outcome below |
| After Phase 4 | 538 GREEN / 1069 · see Phase 4 outcome below |
| After Phase 5 | 560 GREEN / 1069 · see Phase 5 outcome below |
| Never do | modify `neondb` · drop `fatoora_audit` or `fatoora_restore` · migrate to Supabase · push to `main` · change VAT-return behaviour without D1 |

---

## Phase 1 — production blockers

| ID | Work item | Audit items | Status | Evidence |
|---|---|---|---|---|
| W1 | Arabic invoice PDF | 19 | **DONE** | 16 items GREEN, 3 PARTIAL (mirrored RTL layout open); 26 tests; 5/5 verified over HTTP |
| W2 | Security/actor audit trail | 4 | **DONE** | 4 items GREEN; 13 unit tests + 15 live checks; `docs/audit/security-event-log.md` |
| D1 | VAT-return scope | 1 | **OPEN — AWAITING OWNER**; analysed with authoritative basis, recommendation given, behaviour unchanged | `decision-register.md` |
| D7 | Control Center launch requirement | 1 | **OPEN — AWAITING OWNER**; analysed, recommendation given | `decision-register.md` |
| D8 | WhatsApp launch scope | gates 11 | **OPEN — AWAITING OWNER**; analysed, recommendation given | `decision-register.md` |

## Phase 2 — high-risk correctness and reliability

| ID | Work item | Audit items | Status | Evidence |
|---|---|---|---|---|
| W3 | Idempotency + submission reconciliation + retry policy | 12 | **DONE** | Atomic CAS claim on signed/rejected→submitted; retry/backoff ladder + attempt ceiling; `zatca-reconcile` cron; 11/11 scenarios tested in `clearance-crash.test.ts` + `reconcile.test.ts` |
| W4 | Observability | 20 | **DONE** | `lib/log/logger.ts` structured JSON logging + redaction; `x-request-id` correlation on every response; `/api/health/deep`; ~26 console.\* call sites converted |
| W5 | Server-minted AI confirmation tokens | 1 | **DONE** | `AiConfirmation` table, atomic single-use consume, 5-min TTL; `lib/ai/confirmation.test.ts` |
| W6 | Restrict global RAG re-index + AI usage accounting | 3 | **DONE** | `OPERATOR_SECRET`-gated global ingest (fail-closed); `AiUsage` table + token/latency recording from provider responses only; `app/api/ai/ingest/route.test.ts` |
| W7 | Deployment configuration correctness | 1 | **DONE** | `APP_URL`/`NEXT_PUBLIC_APP_URL` production boot check; `appUrl()` used for reset links; `lib/appUrl.test.ts` |
| W26 | Close remaining RISK findings | 1 | **DONE** | F-16 reconfirmed live — does not reproduce (Next.js version fixed it); F-12 confirmed accepted-with-basis, references W21 |

## Phase 3 — important production readiness

| ID | Work item | Audit items | Status | Evidence |
|---|---|---|---|---|
| W8 | Background job substrate | 31 | **DONE** | `lib/services/job-stats.ts` (`getJobStats`, global cross-tenant counts — backs an operator surface); wired into `/api/health/deep`; `job-stats.test.ts` (delta-based, since the counts are intentionally global) |
| W9 | Asia/Riyadh business-timezone policy | 8 | **DONE** | `lib/time/riyadh.ts` (`riyadhToday`/`riyadhTimeOfDay`/`riyadhMonthStartUtc`/`parseRiyadhTimestamp`); 9 unit tests (month/year boundaries, midnight rollover, round-trips); wired into invoice issuance, AI insights, clearance stats, AI tools, onboarding, billing period math, `/api/reports`, `/api/ai/usage` — all previously used server-local or UTC-midnight math |
| W10 | branchId scoping (PRD FR5) | 12 | **DONE** | `getInvoiceList` filters by `branchId`; `POST`/`GET /api/invoices` accept `branchId` with a tenant-ownership check (400 if the branch isn't this company's); `branch-scoping.test.ts` |
| W11 | DB CHECK constraints + orphan detection | 1 | **DONE** | 12 constraints across `Invoice`/`InvoiceLine`/`Subscription`/`Certificate` (migration `20260818160000`); `check-constraints.test.ts`, 10 tests, self-reapplying since `db push --force-reset` drops hand-written SQL constraints |
| W12 | ZATCA XSD/Schematron validation | 1 | **PARTIAL — blocked on X1 for the rest** | Delivered: issue-time BR-KSA business-rule validation (`validateInvoiceAll` now runs inside `issueInvoice()`, before a chain slot or invoice number is burned — previously only checked at ZATCA-submit time); `validation-at-issue.test.ts`, 4 tests. **Not delivered**: formal XSD/Schematron validation against ZATCA's own schema artifacts — those files come from the Fatoora developer portal, gated behind X1's OTP/CSID access (owner-blocked). This is a real, honest gap, not a renamed substitute |
| W13 | Migration safety drills | 15 | **DONE** | `scripts/migration-drill.ts` — fresh-DB `migrate deploy`, idempotency, transactional-DDL failure/recovery, 5,000-invoice volume seed, all against `fatoora_audit`. Run twice this phase (9/9 PASS each time), the second time specifically to verify the new N8 migration applies cleanly |
| W14 | Performance/scalability testing | 22 | **PARTIAL** | `scripts/seed-volume.ts` + `scripts/bench-queries.ts`, real `EXPLAIN (ANALYZE, BUFFERS)` evidence at 5k/20k invoices — `docs/audit/2026-08-18-performance-bench.md`. One real finding (`searchInvoices` is an unindexed seq scan, confirmed scaling linearly, flagged not fixed). **Not measured**: concurrent-issuance at volume (`bench-concurrent.ts` written, not run), RAG retrieval latency, 100-tenant sustained load (needs infra this session doesn't have) |
| W15 | Reachable-domain test coverage | 17 | **PARTIAL** | 3 new route-level test files this phase: `app/api/invoices/[id]/clear/route.test.ts` (plan-gating invariant, cross-tenant refusal, 404/401/409), `branch-scoping.test.ts`, `validation-at-issue.test.ts`; plus `tools.scope.test.ts` exercising real AI tool execution against a DB. Not an exhaustive pass over all 17 M-476–500 items |
| W16 | Failure-injection harness | 7 | **DONE (harness)** | `lib/testing/faults.ts` — scripted submitters, N-times-failing submitter, `faultyDb` Proxy wrapper, failing chat provider; explicitly test-only, not a framework. `failure-injection.test.ts`: DB failure at the CAS-claim step (zero gateway calls, invoice stays retryable) and repeated-gateway-failure-then-recovery via the reconciler (no fabricated verdict across ticks). 2 of the 7 mapped scenarios exercised directly; the harness is reusable for the rest |
| W17 | DevOps staging/patch process | 12 | **PARTIAL** | `docs/19-operations-runbook.md` — environment matrix, CI gate reference, migration process (documents the direct-vs-pooled Neon URL fix this phase found the hard way), release/rollback, emergency patching, dependency-patch cadence. **Not delivered, and can't be**: actually separating the shared dev/prod `neondb` — that needs the owner's Neon console access (X2), stated as such in the runbook itself |
| W18 | Stop the assistant asserting unsupported scope | 2 | **DONE** | `lib/ai/zatca-prompt.ts` KNOWLEDGE BOUNDARIES block (tenant isolation, unverified-production, human-review-required tax/legal calls, KNOWN/UNKNOWN/NOT VERIFIED/REQUIRES HUMAN REVIEW framing); 6 read tools in `lib/ai/tools.ts` tag their output `[tenant-data — this company only]`; `tools.scope.test.ts`, 8 tests against a real DB |
| N8 | Credit/debit/refund/cancellation flows | 5 | **PARTIAL** | Credit/debit notes: `billingReferenceId`/`instructionNote`/`referencedInvoiceId` added to `Invoice` (migration `20260818170000`, soft-linked by invoice number, not hard-required to resolve), `credit-note.test.ts` (3 tests: DB link + PIH chain integrity + XML `InvoiceTypeCode`/`BillingReference`). **Deliberately not implemented** (per "don't invent business rules"): refund flow (A-027, still MISSING — no schema, no flow, no compliance decision made) and cancellation flow (A-028, still MISSING). **New, undecided**: credit notes currently *add to* VAT report/reconciliation totals instead of subtracting — filed as `decision-register.md` D9, not fixed |

**Three investigations carried over from Phase 2's completion report, closed this phase, plus one more found during final verification:**

| ID | Finding | Status | Evidence |
|---|---|---|---|
| F-A | `lib/billing/plan.test.ts` timeout failures | **FIXED — real root cause** | `addInvoices()` test helper did 25-30 sequential `db.invoice.create()` calls; switched to one batched `createMany`. Production code was never at fault. Verified reliable across every subsequent run this phase (19/19 passing, twice) |
| F-B | `deepmerge-ts` → `@prisma/config` → `prisma` security advisory | **INVESTIGATED — accepted risk, no code change** | `prisma` is devDependency-only, `@prisma/client` has zero deps, the vulnerable code path needs a `prisma.config.ts` this repo doesn't have, no fix exists at any Prisma version through 7.9.1. Documented in `docs/audit/2026-08-18-ledger.md` (M-036) and `docs/19-operations-runbook.md` §6. Explicitly did not blindly upgrade or downgrade Prisma |
| F-C | Windows `validate-zatca.ts` libuv teardown failure | **FIXED — real root cause** | `process.exit()` was racing a pending `AbortSignal.timeout()` handle on Windows; switched both exit points to `process.exitCode`. Verified fixed on Windows (clean exit code 0); CI runs this on `ubuntu-latest` where the Windows-specific libuv path never executed anyway |
| — | `clearance-crash.test.ts` concurrent-submission deadlock (not pre-assigned an F-number — found during Phase 3's own final verification, not carried over from Phase 2) | **FIXED — real root cause, found via timing instrumentation, not guessed** | Test assumed the JS call issued first always wins the atomic CAS claim; under real latency the *second* call sometimes wins instead, and the test only released its gated gateway mock after the *assumed* loser rejected — a genuine deadlock when the assumption was wrong, reproduced 3/3 in complete isolation. The production CAS invariant itself was never broken — only the test's assumption about *which* caller wins. Fixed to determine the actual loser via `Promise.race` rather than assume it; verified reliable across 3 consecutive full-file runs post-fix |

## Phase 4 — non-blocking hardening

| ID | Work item | Audit items | Status | Evidence |
|---|---|---|---|---|
| W19 | Session refresh/rotation | 1 | **DONE** | `lib/auth/session.ts` (`iat`, `sessionCookieOptions()`, backdatable `createSessionToken` for tests); sliding refresh in `GET /api/auth/me`, strictly after the revocation check; 3 new tests in `lib/auth/auth.test.ts`, 4 in `app/api/auth/me/route.test.ts` — revocation-dominates-refresh case verified explicitly |
| W20 | Documentation reconciliation | 21 | **PARTIAL** | Real drifts found and fixed: `schema.prisma`'s stale branchId comment, `docs/README.md`'s false "fully implemented, security-hardened" status line, `fatooralite/README.md`'s zero-context boilerplate, `docs/13-production-readiness-report.md`'s missing supersession banner, stale `docs/portal/` HTML regenerated. Not an exhaustive doc-by-doc diff — see per-item notes on M-167…M-187 in `2026-08-18-ledger.md` for exactly what wasn't re-checked |
| W21 | Require Origin on state-changing requests | 1 | **DONE** | `proxy.ts` — Origin/Referer now required whenever the session cookie is present, closes F-12; 6 new tests in `proxy.test.ts`; e2e logout calls given a browser-accurate Origin header |
| W22 | Sequence-gap surfacing + Arabic search/sort validation | 3 | **DONE** | `lib/services/sequence-gaps.ts` (`getSequenceIntegrity`) wired into `GET /api/clearance` + a warning banner on the Compliance Center page; `lib/services/sequence-gaps.test.ts` (4 tests) + `lib/db/arabic-text.test.ts` (5 tests, including an alphabet-order sort assertion against real Postgres collation) |
| W23 | Incident-response runbook | 15 | **DONE** | `docs/20-incident-response.md` — detection/triage via `SecurityEvent` + `x-request-id`, revocation playbooks for every existing mechanism (session/secret/certificate), incident recording template, customer notification template (legal-obligation question explicitly left to owner/legal review) |
| W24 | Dependency advisories / transformers decision | 1 | **DONE** | Re-ran `npm audit --json`: same 7 high advisories, still no fix at any version for either chain — confirmed, not assumed. No dependency change; standing recommendation to set a hosted embedding provider in production documented in `docs/19-operations-runbook.md` §6 |
| W25 | Backup procedures beyond the drill | 10 | **PARTIAL** | `docs/21-backup-restore.md` (logical `pg_dump`/`pg_restore` procedure independent of Neon's own backup features) + `scripts/restore-verify.ts` (migration currency, core-table counts, sequence integrity via W22, PIH chain spot-check) delivered and its refusal path verified. End-to-end drill **not executed** — this machine has no `pg_dump`/`pg_restore` on `PATH` (checked). Neon PITR/backup-encryption/platform-restore stay UNKNOWN, owner-blocked on **X2** |

## Phase 5 — product / post-launch features

Full analysis (business value, security impact, launch requirement, dependency,
complexity, recommended phase) is in `remediation-roadmap.md` §Phase 5.

| ID | Feature | Audit items | Launch required? | Status | Evidence |
|---|---|---|---|---|---|
| N1 | Customer Control Center | 23 | **Contested — D7** | **BLOCKED — decision-gated** | Building it resolves D7 by fiat (grants the contested cross-tenant privileged role); not attempted |
| N2 | Support ticketing + KB | 18 | No | **BLOCKED — depends on N1** | Nothing to build until D7 resolves |
| N3 | WhatsApp integration | 16 | **Contested — D8** | **BLOCKED — decision-gated** | Not attempted. N7 landing strengthens D8's Option B (email at launch, WhatsApp post-launch) but does not decide it |
| N4 | Excel/CSV import | 15 | No (strong adoption lever) | **DONE (scoped first cut)** | CSV-only (not xlsx — a parser dependency this repo's audit posture deliberately avoids) synchronous import/export of customers and products, `lib/import/csv.ts` (hand-rolled RFC-4180 parser, no dependency) + `lib/import/import-service.ts` (preview/commit, transactional `createMany`, refuses entirely on any row error). Gated `requirePermission → requireFeature("bulkImport", Pro-only) → csvImport flag (default OFF) → rate limit → size/row caps`. 33 new tests across parser/service/4 routes. **Deliberately excluded, recorded not silently dropped**: invoice import (would fork the ZATCA signing/PIH chain or mass-issue back-dated documents — undecided business rule, same class as D9), xlsx parsing, column-mapping UI, async/large-file import (no job queue exists), "opening data" import (M-286, no spec exists anywhere) |
| N5 | Support diagnostics report | 17 | No | **BLOCKED — depends on N1** | Nothing to build until D7 resolves |
| N6 | Feature flags | 9 | No | **DONE (D7-safe design)** | `FeatureFlag` table (migration `20260819090000`), `lib/flags/flags.ts` (env override > per-company row > code default, DB failure → default), `scripts/set-flag.ts` (the only write path — no HTTP write route, deliberately, to stay clear of D7's contested admin-UI territory), `GET /api/flags` (own-company-only read). Not a security boundary by design (A-220) — every gated route still runs its own permission/feature check independently. 11 new tests. **A-218 ("admin can see enabled features per customer") stays PARTIAL — `--list` only, no cross-tenant UI, pending D7** |
| N7 | Email invoice delivery | 1 | **Recommended for launch if D8 defers N3** | **DONE** | `lib/email/send.ts` extended with attachment support (Resend's base64 `content` field); `POST /api/invoices/:id/send` — recipient comes exclusively from the invoice's linked `Customer.email`, never the request body (eliminates the free-email-relay abuse vector by construction); rate-limited, flag-gated, refuses drafts and customers with no email on file. 13 new tests, including an explicit "attacker-supplied recipient is ignored" case. Not plan-gated (read-path reasoning, same class as PDF download) |
| N8 | Credit/debit/refund/cancellation flows | 5 | Probably, for real customers | Unchanged — Phase 3 | Not Phase 5 work; see Phase 3's table. Refund/cancellation stay MISSING, D9 stays OPEN |
| N9 | Operations surfaces | 7 | No | **BLOCKED — depends on N1** | Nothing to build until D7 resolves |
| N10 | Remaining integrations | 4 | No | **Closed, not built — rollup** | M-676 (Excel/CSV) and M-677 (Email) are substantively satisfied by N4/N7 landing; M-675 (WhatsApp) stays D8-blocked; M-678 ("External APIs") has no concrete requirement anywhere in the audit or roadmap — recorded as underspecified rather than invented |
| N11 | Admin job visibility | 1 | No | **BLOCKED — depends on N1** | W8 half is done; the N1 half is not |

## Phase 6 — external verification (owner action)

| ID | Track | Audit items | Status |
|---|---|---|---|
| X1 | ZATCA OTP → CSID → real round trip | 48 | BLOCKED ON OWNER |
| X2 | Neon PITR / backup / platform restore | 12 | BLOCKED ON OWNER |
| X3 | Moyasar merchant + sandbox transaction | 1 | BLOCKED ON OWNER |
| X4 | Mandatory end-to-end flow | 11 | BLOCKED (needs X1 + D8) |

## Phase 7 — decisions

| ID | Decision | Status | Needed by |
|---|---|---|---|
| D1 | VAT-return scope | OPEN | Phase 1 |
| D2 | Tax-period closing/locking | OPEN | Phase 3 |
| D3 | Commercial model / pricing | OPEN | Phase 2 |
| D4 | Legal copy | OPEN | Phase 2 |
| D5 | Architecture evaluation ADR | OPEN | Phase 4 |
| D6 | Postgres RLS defence in depth | OPEN | Phase 3 |
| D7 | Control Center launch requirement | OPEN | Phase 1 |
| D8 | WhatsApp launch scope | OPEN | Phase 1 |
| D9 | Credit/debit note amount sign & reconciliation | OPEN | needed to close N8 |

## Phase 8 — final production verification

PLANNED. Runs after approved remediation; re-reconciles all 1069 items with no
PENDING / SKIPPED / UNACCOUNTED.

---

## Item accounting

506 unresolved audit items are fully allocated:
ENG 241 (W1–W26) · HUMAN 48 (D1–D8) · EXTERNAL 63 (X1–X4) · FUTURE 116 (N1–N11)
· LOW 38 (market validation 22, theme presets 16). Nothing is unassigned; see
`2026-08-18-classification.md`. (D9, added Phase 3, is a decision surfaced
during N8's implementation, not a pre-existing catalogued audit item — it
sits outside this original 506/48 accounting on purpose.)


---

## Phase 1 outcome (2026-08-18)

W1 and W2 delivered and verified. Three audit items remain FAILED, all outside
Phase 1's scope and all blocked rather than unfinished:

| Item | Why still FAILED |
|---|---|
| M-501 | Mandatory E2E ends in "Send WhatsApp" — blocked on **D8** |
| M-600 | End-to-end production test — blocked on **X1** and **D8** |
| M-722 | Complete workflow tested — blocked on **X1** and **D8** |

Three W1 items are PARTIAL rather than GREEN, stated honestly: A-189 (RTL
tables), A-190 (RTL forms) and A-191 (RTL invoice layout) describe a **mirrored**
right-to-left page layout. Arabic text now renders correctly everywhere, but the
invoice page is still laid out left-to-right. That is a design change, not a
rendering fix, and claiming it would be false.

**Next session: start Phase 2 (W3, W4, W5, W6, W7, W26).** Do not start it in the
same context as Phase 1.

---

## Phase 2 outcome (2026-08-18)

All six planned work items (W3, W4, W5, W6, W7, W26) delivered and verified —
see the Phase 2 table above and `handoff.md`'s 2026-08-18 Phase 2 entry for
the full write-up. Test suite: 447 passed / 2 pre-existing failures / 0
skipped. Ledger: 507 GREEN / 1069. Committed as `1c93593`.

The 2 failures (`lib/billing/plan.test.ts`) were carried forward, unfixed,
as explicitly out of Phase 2's scope — later root-caused and fixed in Phase 3
as F-A (see the F-A/F-B/F-C table above).

**Next session: start Phase 3.** Investigate F-A/F-B/F-C first (all three
carried an explicit "determine the real cause, don't paper over it"
instruction), then W8–W18 and N8 (promoted from Phase 5).

---

## Phase 3 outcome (2026-08-18)

12 of 12 planned items (W8–W18, N8) have real delivered work; 5 are DONE
outright, 5 are PARTIAL with the gap stated honestly (W12/W14/W15/W17/N8, all
gated on something outside this session's reach — X1, missing infra, or an
undecided business rule), W16 is DONE for the harness with 2 of 7 mapped
scenarios exercised. Nothing was marked DONE on the basis of code that wasn't
actually executed and verified against `fatoora_audit`. See the Phase 3 table
above for per-item evidence.

F-A and F-C were fixed with real, verified root causes (not timeout bumps or
suppression). F-B was investigated to a documented accepted-risk conclusion,
no code change, no blind version bump in either direction.

One new decision surfaced during implementation (not present in the original
506-item accounting): **D9**, credit/debit notes currently inflate the VAT
report/reconciliation totals instead of netting them out. Filed in
`decision-register.md`, not fixed, per this phase's own instruction not to
invent business rules that need a compliance call.

Two things N8's own audit-item list named (refund, cancellation — A-027,
A-028) stay MISSING on purpose: both would require inventing a business rule
this session has no authority to decide. Documented, not built.

A real, non-code cost this phase: two independent AI-agent safety gates
(Prisma's own `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` check, and Claude
Code's own permission classifier, which also blocks an agent from
self-granting that consent via a settings.json edit) meant the 6
schema-pushing DB-gated test files could not be run end-to-end by the
assistant alone in one sitting — they required a human to literally run the
command. See `handoff.md`'s Phase 3 entry and
`docs/SESSION_HANDOFF_2026-08-18.md` for the exact mechanics; this is
infrastructure friction, not a code defect, and cost real session time.

Full regression confirmed clean before closing this phase: **73 test files,
497 tests, 0 failed, 0 skipped** (6 schema-pushing files run separately,
the other 67 run together with `--no-file-parallelism` — see
`docs/SESSION_HANDOFF_2026-08-18.md` §3 for why that split is required).
That count includes the 2 tests failing at Phase 2's baseline, now fixed by
F-A — Phase 3 closes with strictly fewer known issues than it opened with.
One additional real bug, outside F-A/B/C's original scope, was found and
fixed during this final verification: a race-condition deadlock in
`clearance-crash.test.ts`'s concurrent-submission test (it assumed the
JS call order matched the database's claim-race order, which network
latency doesn't guarantee) — see `docs/SESSION_HANDOFF_2026-08-18.md` §3.4
for the full root-cause writeup.

**Next session: start Phase 4**, or resolve D2/D6/D9 first if credit-note
correctness for real customers is more urgent than Phase 4's items.

---

## Phase 4 outcome (2026-08-18)

7 of 7 planned items (W19–W25) have real delivered work; 5 are DONE outright
(W19, W21, W22, W23, W24), 2 are PARTIAL with the gap stated honestly (W20 —
a bounded reconciliation, not an exhaustive doc audit; W25 — gated on
missing local postgres tooling for the drill and on X2 for Neon's own
backup capability). Nothing was marked DONE on the basis of an assumption
that wasn't actually checked: W24's "no fix exists" was re-verified by
re-running `npm audit --json` this session rather than trusted from Phase
3's snapshot; W20's WhatsApp/Excel-import "drift" the plan predicted turned
out not to exist on inspection (recorded as verified-accurate, not silently
dropped).

No OPEN decision (D1–D9) was resolved or implemented — D5's "write the ADR"
recommendation was explicitly flagged by the architect as excluded from
this phase's scope and left for the owner to decide separately.

Full regression: see `docs/SESSION_HANDOFF_2026-08-18.md` §2 (Phase 4
addendum) for the exact count. 3 new test files added this phase
(`app/api/auth/me/route.test.ts`, `lib/services/sequence-gaps.test.ts`,
`lib/db/arabic-text.test.ts`), none call `pushTestSchema()`, all join the
existing non-schema-pushing batch.

**Next session: start Phase 5**, or resolve D1/D2/D3/D4/D5/D6/D7/D8/D9 first
if any of those is more urgent for real customers than Phase 5's product
features. Do not start Phase 5 in the same context as this one — same
convention as every prior phase transition in this programme.

---

## Phase 5 outcome (2026-08-19)

Of the roadmap's 11 candidate items (N1–N11), planning established up front
that 6 were not buildable this phase at all: N1 and N3 are each gated on an
OPEN decision (D7, D8 respectively) — implementing either would resolve
that decision by fiat, forbidden by this programme's own rules. N2, N5, N9
and N11 each name N1 in the roadmap's own dependency column, so they're
blocked transitively. N8 was already delivered (PARTIAL) in Phase 3 and
wasn't re-touched. That left **N4, N6, N7** as the actual scope, plus
**N10**, closed as a rollup rather than built.

**N6 and N7 are DONE outright.** N7 (email invoice delivery) closes M-260;
its one load-bearing design decision — the recipient comes exclusively from
the invoice's linked `Customer.email`, never the request body — was tested
explicitly by attempting to smuggle a different address through the API and
asserting it was ignored. N6 (feature flags) closes 7 of 8 A-214…A-221
items outright; A-218 (a cross-tenant admin view of flags) stays PARTIAL on
purpose, since building it would itself encroach on D7's contested
territory — the whole feature was designed around that constraint (no HTTP
write path; `scripts/set-flag.ts`, an operator-with-database-access tool,
is the only way to change a flag).

**N4 is DONE for a deliberately scoped first cut**, decided during planning
before any code existed, not discovered as oversized mid-implementation.
Delivered: synchronous CSV import/export of customers and products, a
hand-rolled dependency-free RFC-4180 parser, preview-then-commit with an
all-or-nothing transactional insert, and the first real enforcement test
for the `bulkImport` entitlement (previously an honest placeholder with
nothing behind it). Excluded and why, each recorded rather than silently
dropped: `.xlsx` support (would add exactly the kind of parser-dependency
advisory surface this repo's CI posture exists to avoid), invoice import
(would fork the ZATCA signing/PIH chain or mass-issue back-dated documents —
an undecided business rule, same class as D9), a column-mapping UI (fixed
headers + template instead), and an async pipeline for large files (no job
queue exists — confirmed by reading W8's actual implementation before
assuming otherwise).

**N10 is closed, not built.** M-676 (Excel/CSV) and M-677 (Email) are
satisfied by N4/N7 landing; M-675 (WhatsApp) stays blocked on D8; M-678
("External APIs") has no concrete specification anywhere in the audit or
roadmap and was recorded as underspecified rather than given invented scope.

**No OPEN decision (D1–D9) was resolved or implemented this phase.**

**A new, real finding surfaced by browser-testing this phase's UI (not by
the automated suite, which never touches it): `neondb` — the shared
dev/demo database — was missing 7 migrations dating back to Phase 1**,
including `SecurityEvent` (W2) and several `Invoice` columns (Phase 3).
`GET /api/invoices` 500'd against the live dev/demo deployment as a direct
result. This predated Phase 5 by three phases and was not caused by this
session. Not fixed in the same session it was found, since `neondb` is
explicitly off-limits without owner authorization — flagged instead, with
a migration-safety report (7 migrations named, contents classified,
additive/reversible/destructive assessed, CHECK-constraint data verified
against live rows, exact command given, nothing executed).

**RESOLVED same day, follow-up session (2026-08-19), with explicit owner
approval.** `prisma migrate deploy` ran clean against `neondb` — exactly
the 7 expected migrations, no anomalies. Verified: `migrate status` reports
18/18; all new tables/columns/constraints/indexes present via direct
`information_schema` queries; existing data untouched (`Company` still 1
row, `Invoice` still 2 rows, same ids, correct column defaults); `GET
/api/invoices` now returns 200 with real data; `GET /api/flags` resolves
from the table instead of falling back. 87 tests across the routes/paths
that touch the migrated schema re-run clean against `fatoora_audit`
(unaffected — separate database) as a sanity check; all 5 CI gates re-run
clean. Full investigation-then-resolution record:
`docs/SESSION_HANDOFF_2026-08-18.md` §3.7.

Full regression confirmed clean before closing this phase: **87 test
files, 575 tests, 0 failed, 0 skipped** (6 schema-pushing files run
separately, the other 81 — 11 new this phase — run together with
`--no-file-parallelism`; see `docs/SESSION_HANDOFF_2026-08-18.md` §2 for
the exact count reconciliation).

**Next session: start Phase 6**, or resolve any of D1–D9 / apply the
pending `neondb` migrations first if either is more urgent for real
customers than Phase 6's items. Do not start Phase 6 in the same context as
this one — same convention as every prior phase transition in this
programme.

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
| Current phase | **Phase 1 COMPLETE** — Phase 2 not started |
| Branch | `audit/production-readiness-2026-08-18` |
| Audit baseline | 461 GREEN / 1069 · 363 tests |
| After Phase 1 | **481 GREEN / 1069 · 402 tests, 0 skipped** |
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

| ID | Work item | Audit items | Status |
|---|---|---|---|
| W3 | Idempotency + submission reconciliation + retry policy | 12 | PLANNED |
| W4 | Observability | 20 | PLANNED |
| W5 | Server-minted AI confirmation tokens | 1 | PLANNED |
| W6 | Restrict global RAG re-index + AI usage accounting | 3 | PLANNED |
| W7 | Deployment configuration correctness | 1 | PLANNED |
| W26 | Close remaining RISK findings | 1 | PLANNED |

## Phase 3 — important production readiness

| ID | Work item | Audit items | Status |
|---|---|---|---|
| W8 | Background job substrate | 31 | PLANNED |
| W9 | Asia/Riyadh business-timezone policy | 8 | PLANNED |
| W10 | branchId scoping (PRD FR5) | 12 | PLANNED |
| W11 | DB CHECK constraints + orphan detection | 1 | PLANNED |
| W12 | ZATCA XSD/Schematron validation | 1 | PLANNED (depends on X1) |
| W13 | Migration safety drills | 15 | PLANNED |
| W14 | Performance/scalability testing | 22 | PLANNED |
| W15 | Reachable-domain test coverage | 17 | PLANNED |
| W16 | Failure-injection harness | 7 | PLANNED |
| W17 | DevOps staging/patch process | 12 | PLANNED |
| W18 | Stop the assistant asserting unsupported scope | 2 | PLANNED |
| N8* | Credit/debit/refund/cancellation flows | 5 | PLANNED — *recommended promotion from Phase 5* |

## Phase 4 — non-blocking hardening

| ID | Work item | Audit items | Status |
|---|---|---|---|
| W19 | Session refresh/rotation | 1 | PLANNED |
| W20 | Documentation reconciliation | 21 | PLANNED |
| W21 | Require Origin on state-changing requests | 1 | PLANNED |
| W22 | Sequence-gap surfacing + Arabic search/sort validation | 3 | PLANNED |
| W23 | Incident-response runbook | 15 | PLANNED |
| W24 | Dependency advisories / transformers decision | 1 | PLANNED |
| W25 | Backup procedures beyond the drill | 10 | PLANNED (depends on X2) |

## Phase 5 — product / post-launch features

Full analysis (business value, security impact, launch requirement, dependency,
complexity, recommended phase) is in `remediation-roadmap.md` §Phase 5.

| ID | Feature | Audit items | Launch required? | Status |
|---|---|---|---|---|
| N1 | Customer Control Center | 23 | **Contested — D7** | PLANNED |
| N2 | Support ticketing + KB | 18 | No | PLANNED |
| N3 | WhatsApp integration | 16 | **Contested — D8** | PLANNED |
| N4 | Excel/CSV import | 15 | No (strong adoption lever) | PLANNED |
| N5 | Support diagnostics report | 17 | No | PLANNED |
| N6 | Feature flags | 9 | No | PLANNED |
| N7 | Email invoice delivery | 1 | **Recommended for launch if D8 defers N3** | PLANNED |
| N8 | Credit/debit/refund/cancellation flows | 5 | Probably, for real customers | PLANNED → Phase 3 |
| N9 | Operations surfaces | 7 | No | PLANNED |
| N10 | Remaining integrations | 4 | No | PLANNED |
| N11 | Admin job visibility | 1 | No | PLANNED |

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

## Phase 8 — final production verification

PLANNED. Runs after approved remediation; re-reconciles all 1069 items with no
PENDING / SKIPPED / UNACCOUNTED.

---

## Item accounting

506 unresolved audit items are fully allocated:
ENG 241 (W1–W26) · HUMAN 48 (D1–D8) · EXTERNAL 63 (X1–X4) · FUTURE 116 (N1–N11)
· LOW 38 (market validation 22, theme presets 16). Nothing is unassigned; see
`2026-08-18-classification.md`.


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

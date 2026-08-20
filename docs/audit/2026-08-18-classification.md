# Remediation classification — 506 unresolved items


## ENG (241)

| Priority | Work item | Items | IDs |
|---|---|---|---|
| P0 | W1 Arabic invoice PDF: embed Unicode font + shaping engine (or HTML→PDF) | 19 | M-218…A-341 |
| P0 | W2 Security/actor audit trail: migration + write sites + read surface | 4 | M-037, M-507, A-034, A-044 |
| P1 | W26 Close the four open RISK findings (F-10, F-11, F-12, F-16) | 1 | M-721 |
| P1 | W3 Idempotency keys, submission reconciliation job, retry with backoff + ceiling | 12 | M-202…A-308 |
| P1 | W4 Observability: structured logging, error tracking, correlation IDs, alerting | 20 | M-465…A-334 |
| P1 | W5 Server-minted single-use confirmation tokens for AI write actions (F-10) | 1 | A-303 |
| P1 | W6 Restrict global RAG re-index to an operator credential; AI usage accounting (F-11) | 3 | M-051, A-128, A-129 |
| P1 | W7 Deployment config correctness: APP_URL + RESEND_API_KEY documented/required, reset URL via appUrl() (F-13/F-14/F-15) | 1 | M-004 |
| P2 | W10 branchId scoping end to end (PRD FR5) | 12 | M-502…M-514 |
| P2 | W11 Database CHECK constraints + orphan detection queries | 1 | A-101 |
| P2 | W12 ZATCA XSD/schematron validation beyond the 12-rule BR-KSA subset | 1 | M-205 |
| P2 | W13 Migration safety: compatibility matrix, failed-migration drill, v1→v2 upgrade drill | 15 | A-199…A-342 |
| P2 | W14 Performance + scale testing at realistic tenant/volume counts | 22 | M-497…A-337 |
| P2 | W15 Test coverage gaps in reachable domains | 17 | M-476…M-500 |
| P2 | W16 Failure-injection harness (process kill, DB timeout, malformed/duplicate responses) | 7 | A-316, A-317, A-318, A-324, A-326, A-333, A-347 |
| P2 | W17 DevOps: staging separation, deploy tests, patch process | 12 | M-458…M-475 |
| P2 | W18 Stop the assistant asserting a scope it does not have | 2 | A-305, A-307 |
| P2 | W25 Backup/recovery procedures beyond the drill already performed | 10 | M-445…M-457 |
| P2 | W8 Background job substrate: persistence, visibility, dead-letter, admin inspection | 31 | M-428…A-067 |
| P2 | W9 Explicit business-timezone policy (Asia/Riyadh) across reports, crons, timestamps | 8 | A-172, A-173, A-174, A-175, A-176, A-177, A-182, A-184 |
| P3 | W19 Session refresh/rotation | 1 | M-006 |
| P3 | W20 Documentation reconciliation against implementation | 21 | M-167…M-187 |
| P3 | W21 Require Origin on state-changing API requests (F-12) | 1 | A-141 |
| P3 | W22 Sequence-gap surfacing; Arabic search/sort validation | 3 | A-030, A-197, A-198 |
| P3 | W23 Incident-response runbook + key/session revocation procedures | 15 | A-084…A-335 |
| P3 | W24 Dependency advisories: drop @huggingface/transformers or accept documented risk | 1 | M-036 |

## HUMAN (48)

| Priority | Work item | Items | IDs |
|---|---|---|---|
| - | D1 VAT-return scope: do issued-but-uncleared invoices belong in the return? | 1 | M-427 |
| - | D2 Tax-period closing/locking semantics | 1 | M-283 |
| - | D3 Commercial model: final Pro price, annual plan, limits, coupons | 17 | M-515…M-533 |
| - | D4 Legal copy: remove DRAFT banners, reviewed ToS/privacy/retention | 11 | M-574…M-586 |
| - | D5 Document the hybrid-vs-standalone architecture evaluation (decision is de facto made) | 16 | M-601…M-616 |
| - | D6 Postgres RLS as defence in depth beneath app-level tenant scoping | 1 | M-016 |
| - | D7 Does the absent Customer Control Center gate launch? Conflicts with the deliberate no-platform-admin decision | 1 | M-598 |

## EXT (63)

| Priority | Work item | Items | IDs |
|---|---|---|---|
| - | X1 ZATCA: portal OTP → compliance CSID → production CSID → real round trip | 39 | M-188…M-713 |
| - | X2 Neon console: confirm PITR enabled, backup encryption, restore drill on the platform | 12 | M-446…A-246 |
| - | X3 Moyasar: merchant account + one sandbox transaction to confirm the webhook payload | 1 | M-531 |
| - | X4 Mandatory end-to-end flow (blocked by X1 and by WhatsApp) | 11 | M-501…M-722 |

## FUTURE (116)

| Priority | Work item | Items | IDs |
|---|---|---|---|
| - | N1 Customer Control Center / platform-admin surface | 23 | M-052…M-074 |
| - | N10 Remaining integrations (email, external APIs) | 4 | M-675, M-676, M-677, M-678 |
| - | N2 Support ticketing + knowledge base | 18 | M-556…M-573 |
| - | N3 WhatsApp Business API integration | 16 | M-261…M-313 |
| - | N4 Excel/CSV import pipeline | 15 | M-284…M-298 |
| - | N5 Support diagnostics report | 18 | M-720…A-344 |
| - | N6 Feature-flag system | 9 | A-214…A-343 |
| - | N7 Email delivery of invoices | 1 | M-260 |
| - | N8 Credit/debit/refund/cancellation flows end to end | 5 | M-244, A-025, A-026, A-027, A-028 |
| - | N9 Operations surfaces (admin, billing ops, monitoring dashboards) | 7 | M-693, M-694, M-695, M-696, M-697, M-698, M-699 |

## LOW (38)

| Priority | Work item | Items | IDs |
|---|---|---|---|
| - | L1 Sales/market validation — not an engineering artifact; belongs to GTM | 22 | M-534…M-555 |
| - | L2 Additional theme presets / visual identity polish | 16 | M-383…M-398 |

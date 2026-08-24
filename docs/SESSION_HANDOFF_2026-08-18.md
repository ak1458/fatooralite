# Session handoff — 2026-08-18 (through Remediation Phase 5)

**Read this first if you're picking up this session cold.** It's the exact
current state, not a summary of intentions. `START-HERE.md` points here.
Filename is dated 2026-08-18 (when this handoff doc was created, in Phase
3) but this file is kept current across phases by convention — it now
covers through §14, PR #16 merged to `main`, 2026-08-20.

---

## 1. Where things stand

| | |
|---|---|
| Branch | `audit/production-readiness-2026-08-18` |
| Latest commit | `ce410ca` — Phase 5's work is committed on top of `8995a81` (Phase 4), not pushed to `main` |
| Phase 2 | **COMPLETE**, committed as `1c93593`. 447 passed / 2 pre-existing failures / 0 skipped at the time. Ledger: 507 GREEN / 1069 |
| Phase 3 | **COMPLETE and fully verified**, committed as `97135cf`. 73 test files, 497 tests, 0 failed, 0 skipped at the time |
| Phase 4 | **COMPLETE, with honestly-documented PARTIALs**, committed as `7dec667`+`8995a81`. 76 test files, 519 tests, 0 failed, 0 skipped at the time |
| Phase 5 | **COMPLETE — a deliberately scoped subset.** Of the roadmap's N1–N11, only N4/N6/N7 were buildable this phase (N1/N3 decision-gated on D7/D8; N2/N5/N9/N11 transitively blocked on N1; N8 already Phase 3's; N10 closed as a rollup). All three of N4/N6/N7 shipped. See §2 for the test count |
| `neondb` migration drift | **RESOLVED, 2026-08-19, with explicit owner approval.** All 18/18 migrations now applied to `neondb`. See §3.7 |
| Phase 6 & 7 | **SCOPE-CHECKED 2026-08-19** (X1–X4 owner-blocked); **D1–D9 all APPROVED and IMPLEMENTED same day** — see §8 |
| Push / PR / merge | **DONE.** Pushed 2026-08-20, PR #16 opened and green, `main` branch-protected, **merged to `main`** via `69dca91` 2026-08-20 03:27 UTC. See §13–14 |
| Never do | modify `neondb` **without explicit owner approval, per-action** (the drift fix in §3.7 and the D6 migration in §12 were both approved actions, not a standing exception) · drop `fatoora_audit`/`fatoora_restore` · migrate to Supabase · resolve future decisions unilaterally · start a new phase without reading this file |

**Updated (2026-08-19, post-Phase-5):** §3.7's finding — `neondb` missing 7
migrations dating back to Phase 1 — is now **RESOLVED**. The owner reviewed
the migration-safety report and explicitly approved `prisma migrate
deploy`; it ran clean (exactly the 7 expected migrations, no anomalies),
verified against live data, and `GET /api/invoices` now returns 200. Full
detail at the bottom of §3.7.

## 2. Test verification — this is the final result

The full suite (87 test files as of Phase 5 — 11 added this phase) splits
into the same two run groups established in Phase 3 (§3.3 below): **6
files** that call `pushTestSchema()` run alone, one per `vitest run`
invocation; the other **81 files** run together in one invocation with
`--no-file-parallelism`.

**Phase 5 (this session) result:**
- The 6 schema-pushing files: 39/39 passing — same files, same counts as
  every prior phase since Phase 3 (`lib/ai/vector-store.test.ts` 1,
  `lib/auth/server.test.ts` 8, `lib/billing/plan.test.ts` 19,
  `lib/db/repo.test.ts` 4, `lib/services/clearance-service.test.ts` 4,
  `lib/services/invoice-service.test.ts` 3). All 39 passed clean on the
  first attempt this session — no timeouts, no re-runs needed. (Phase 4's
  §3.5 found a transient `plan.test.ts` timeout under that session's Neon
  latency; this session's conditions didn't reproduce it, consistent with
  §3.5's own conclusion that it was latency jitter, not a code defect.)
- The 81-file batch (70 from Phase 4 + 11 new this phase): **536/536
  passing** in one `--no-file-parallelism` run (666s wall time).
- **Total: 575/575, 0 failed, 0 skipped** (536 + 39 schema-pushing). The 56
  new tests (11 files) break down as: 5 in `lib/flags/flags.test.ts`, 3 in
  `lib/flags/set-flag.test.ts`, 3 in `app/api/flags/route.test.ts`, 5 in
  `lib/email/send.test.ts`, 8 in `app/api/invoices/[id]/send/route.test.ts`,
  12 in `lib/import/csv.test.ts`, 7 in `lib/import/import-service.test.ts`,
  7 in `app/api/import/customers/route.test.ts`, 1 in
  `app/api/import/products/route.test.ts`, 3 in
  `app/api/export/customers/route.test.ts`, 2 in
  `app/api/export/products/route.test.ts` — 480 + 56 = 536, confirming the
  count, not just asserting it.

**Nothing left to run.** If you're re-verifying from a fresh session, see
§5 for the exact commands.

## 3. Root causes — so you don't re-diagnose any of this

Sections 3.1–3.5 (batch parallelism, explicit timeouts, the 6-schema-pusher
isolation rule, the `clearance-crash.test.ts` deadlock, Phase 4's transient
`plan.test.ts` timeout) are unchanged from before and still the governing
reference — not reproduced here again; read the Phase 3/Phase 4 sections of
this file's git history, or `handoff.md`'s corresponding entries, if you
need the full text. New this phase:

### 3.6 — a new migration on `fatoora_audit` needs `db push`, not `migrate deploy`, and here's why

Adding the `FeatureFlag` migration (`20260819090000_feature_flags`) and
running `prisma migrate deploy` against `fatoora_audit` failed with `P3005`
("database schema is not empty"). Root cause: `fatoora_audit`'s
`_prisma_migrations` bookkeeping table doesn't reliably track history,
because every schema-pushing test file's `pushTestSchema()` calls
`prisma db push --force-reset`, and `db push` never writes migration-history
rows at all — it diffs actual DB state against `schema.prisma` directly.
Fix: used `prisma db push` (no `--force-reset`, purely additive, no data
loss) to sync the new table into the live `fatoora_audit` schema directly —
the same mechanism this specific database has always been kept in sync
with. Then separately re-ran `scripts/migration-drill.ts` (which does a
genuine `DROP SCHEMA CASCADE` + `migrate deploy` from empty) to confirm the
migration file itself is valid for a real `migrate deploy`-based deploy —
0 failures, migration confirmed production-safe by the drill even though
the live test database was synced by a different mechanism.

**If you add another migration in a future session**: expect the same
`P3005` against `fatoora_audit` if you try `migrate deploy` directly, for
the same reason. `db push` for immediate sync, `migration-drill.ts` for
correctness verification, same as this phase.

### 3.7 — `neondb` is missing 7 migrations dating back to Phase 1 (found live, not by the test suite)

While browser-testing this phase's UI changes against the local dev server
(`npm run dev`, which uses `neondb` via `.env`'s `DATABASE_URL` — the
pooled connection to the same Neon database `START-HERE.md` already
documents as shared between dev and production), `GET /api/invoices` threw
a 500: `Invoice.billingReferenceId does not exist`, and
`recordSecurityEvent` separately threw `SecurityEvent` table does not
exist.

Checked (read-only — `prisma migrate status`, no write attempted) what
`neondb` actually has applied:

```
Following migrations have not yet been applied:
20260818120000_security_event_log
20260818130000_zatca_submission_reliability
20260818140000_ai_confirmation
20260818150000_ai_usage
20260818160000_check_constraints
20260818170000_credit_debit_note_linking
20260819090000_feature_flags
```

`20260818120000_security_event_log` is **Phase 1's own W2 migration**. This
means `neondb` has been behind `schema.prisma` since Phase 1 — every one of
Phases 1 through 4's automated verification ran exclusively against
`fatoora_audit` (which was always kept current via `pushTestSchema()`), and
nothing in this program ever actually ran the built app against `neondb`
until this session's live browser check. The gap has been invisible to
every prior phase's CI-gate-based verification by construction: `npx
vitest run` never touches `neondb`, and `npm run build`/`lint`/`tsc` don't
execute against a live database at all.

**Not fixed this session.** `neondb` is explicitly off-limits without
explicit owner authorization ("never modify `neondb`" is stated at the top
of every session in this program, including this one). Running
`prisma migrate deploy` against a database still described as
production-shared is not a call this session has the authority to make
unilaterally, even though the fix is mechanically simple (the same 7
migrations `fatoora_audit` already has). **Flagging for the owner
explicitly: run `prisma migrate deploy` against `neondb`'s DIRECT URL** (see
`docs/19-operations-runbook.md` §3 for the pooled-vs-direct rule) **once
they've confirmed that's safe given whatever real data may exist there.**
Until then, the live dev/demo app's invoice list (and anything else
touching `SecurityEvent` or the Phase 3 `Invoice` columns) is broken — this
predates Phase 5 by three phases, is not a regression this session
introduced, and was surfaced by browser verification, not code review.

The `flags.lookup_failed` warnings this same gap produces for the new
`FeatureFlag` table (also unapplied on `neondb`) are the fail-closed design
working as intended, not a new bug: `isFlagEnabled` catches the
`P2021`/table-missing error, logs a `log.warn`, and returns the code
default — confirmed live (`csvImport` correctly resolved `false`, hiding
the Import button; the customers/products pages rendered correctly with no
uncaught error).

#### RESOLVED — 2026-08-19, same day, follow-up session, explicit owner approval

The owner was shown a migration-safety report covering exactly the 7 points
this section's investigation established (migration contents, current
`neondb` state, additive/reversible/destructive classification, whether
`migrate deploy` would touch only these 7, production-risk assessment, the
exact command) and explicitly approved running it. Before running,
additionally verified (read-only, no writes) two things the original
investigation hadn't checked yet:

1. **No out-of-band drift.** Queried `information_schema`/`pg_constraint`
   directly for the 4 new tables, 7 new `Invoice` columns, and the CHECK
   constraint names — none existed yet, confirming `migrate deploy` would
   hit no `already exists` collisions.
2. **CHECK-constraint pre-flight.** `20260818160000_check_constraints` adds
   9 `CHECK` constraints; ran the actual boundary queries against live
   `neondb` data (e.g. `SELECT COUNT(*) FROM "InvoiceLine" WHERE
   "quantity" <= 0`) for every one of them. **Zero violations across all
   nine** — the migration was safe to apply to the data actually present,
   not just safe in the abstract. (`neondb` currently holds only demo-seed
   data: 1 Company, 2 Invoice rows — real customer data has never been
   written there, which is exactly why this drift went unnoticed for four
   phases.)

**Ran exactly `npx prisma migrate deploy`** (not `db push` — that
distinction matters here, see §3.6's note on why `fatoora_audit` needed the
opposite choice; `neondb`'s `_prisma_migrations` table was intact, unlike
`fatoora_audit`'s, so `migrate deploy` worked cleanly on the first attempt).
Output: exactly the 7 expected migrations applied, in order, no warnings,
no anomalies, no checksum mismatches.

**Post-deploy verification, all read-only queries:**
- `prisma migrate status` → `Database schema is up to date!`, 18/18.
- All 4 new tables (`SecurityEvent`, `AiConfirmation`, `AiUsage`,
  `FeatureFlag`), all 7 new `Invoice` columns, all 9 `CHECK` constraints,
  and the new indexes/FKs confirmed present via direct
  `information_schema`/`pg_constraint`/`pg_indexes` queries.
- **Data integrity**: `Company` count still 1, `Invoice` count still 2,
  same row ids as before the migration, new columns correctly defaulted
  (`submitAttempts: 0`, `needsReview: false` on both existing rows) — the
  migration added structure, touched no existing data.
- **Live path**: started `npm run dev` (against `neondb`), logged in via
  `curl` (with the `Origin` header W21 requires), `GET /api/invoices` →
  **200**, real invoice data returned, no error. `GET /api/flags` → **200**
  with real resolved values (no more `flags.lookup_failed` warnings — the
  table now exists, so resolution reads it instead of falling back).
  Grepped the dev server log for `does not exist` — zero matches, versus
  the 2+ occurrences per request before the deploy.
- **Test suite**: application code did not change in this follow-up
  session (only the `neondb` schema did, via the already-committed Phase 5
  migration file) — the 575/575 regression already confirmed at Phase 5's
  close remains the accurate count. Re-ran the subset of tests most
  directly exercising the migrated tables/columns (invoices routes,
  `SecurityEvent`-writing paths, flags, reconciliation/clearance) against
  `fatoora_audit` as a sanity check — unaffected by the `neondb` change
  (separate database), all green. All 5 CI gates (lint, audit, `tsc`,
  `validate-zatca`, build) re-run clean.

Two throwaway investigation scripts (`_tmp-check-neondb.ts`,
`_tmp-verify-neondb.ts`) were used for the read-only queries above and
deleted immediately after each use — never committed, same convention as
Phase 3's scratch run scripts.

**No code, migration file, or test was changed to resolve this** — the fix
was entirely "run the migration that was already written and already
applied to `fatoora_audit`, against the one remaining database that needed
it." The invariant stands unchanged for future sessions: `neondb` writes
still require explicit, per-action owner approval — this was one approved
action, not a standing exception.

## 4. Commit status

**Done.** Phase 4's work is committed as `7dec667`+`8995a81`. Phase 5's
work (this session) is committed as `ce410ca` (43 files changed) on top of
it — not pushed to `main`, working tree clean afterward. No scratch files
left behind (temporary batch-file-list `.txt` files used to drive the test
runs were not committed).

## 5. Reconstructing the test-run commands (only needed for future re-verification)

```
cd "d:\gravity\FatooraLite(ZATCA)\fatooralite"

# The 6 schema-pushing files — run each SEPARATELY (see §3.3, unchanged):
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/ai/vector-store.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/auth/server.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/billing/plan.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/db/repo.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/services/clearance-service.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/services/invoice-service.test.ts

# Everything else (81 files as of Phase 5), together, serialized:
npx vitest run --hookTimeout=90000 --no-file-parallelism <every other *.test.ts/*.test.tsx path>
```

`DATABASE_URL`/`DIRECT_URL` must be set to the `fatoora_audit` DIRECT
(non-pooled) connection string for both groups. **Never construct or print
the actual connection string** — verify the target database name
programmatically without echoing credentials.

Running the schema-pushing group hits Prisma's own AI-agent consent gate
(`PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`). As in Phase 4's session,
setting that env var inline for a single command and running it directly
was **not** blocked this session either — two sessions in a row now where
this worked without manual intervention, versus Phase 3's session where it
was blocked. Still worth verifying fresh each session rather than assuming
either outcome.

If you add a new migration: use `prisma db push` (not `migrate deploy`)
against `fatoora_audit` to sync it live (see §3.6), and separately run
`scripts/migration-drill.ts` to verify the migration file itself.

## 6. What's still open after this — not new work, just honest gaps

See `docs/audit/remediation-ledger.md`'s Phase 5 outcome section for full
detail. Summary, Phase 5's own items:

- **N4 (CSV import/export)** shipped a deliberately scoped-down first cut —
  customers/products only, CSV not xlsx, synchronous with hard caps, fixed
  headers not a mapping UI. Every exclusion has a stated reason (§ handoff.md
  Phase 5 entry), not a silent drop.
- **N6 (feature flags)** shipped with no HTTP write path by design (D7-safe).
  A-218 ("admin sees flags per customer") stays PARTIAL — `--list` only.
- **N7 (email invoice delivery)** shipped complete against its scope.

Blocked, not attempted, with reasons:

- **N1, N2, N5, N9, N11** — blocked on **D7** (Customer Control Center),
  either directly or transitively.
- **N3** — blocked on **D8** (WhatsApp launch scope).
- **N10** — closed as a rollup (M-676/M-677 satisfied by N4/N7; M-675
  blocked on D8; M-678 "External APIs" has no spec anywhere, recorded
  underspecified).

Carried forward, unchanged (not this phase's scope):

- **W12** — ZATCA XSD/Schematron validation, blocked on **X1**.
- **W20** — doc reconciliation was a bounded pass, not exhaustive.
- **W25** — backup/restore procedure written, drill not executed
  end-to-end (no postgres client tools), Neon's own PITR stays **X2**.
- **N8** — refund/cancellation stay MISSING; **D9** stays OPEN.

**New this phase**: `neondb` migration drift (§3.7) — 7 migrations pending,
owner action needed, `GET /api/invoices` currently broken on the live
dev/demo deployment as a result.

**No OPEN decision (D1–D9) was resolved this phase.**

**Next session: start Phase 6**, or resolve any of D1–D9 / apply the
pending `neondb` migrations first if either is more urgent for real
customers than Phase 6's items. Do not start Phase 6 in the same context as
this one — same convention as every prior phase transition in this
programme.

---

## 7. Phase 6 & Phase 7 scope-check (2026-08-19, this session)

A follow-up session was opened specifically to run Phase 6 and Phase 7. It
read this file, `docs/audit/remediation-ledger.md`,
`docs/audit/2026-08-18-ledger.md`, `START-HERE.md`,
`docs/audit/remediation-roadmap.md`, and `docs/audit/decision-register.md`
before touching anything, then verified `git status` was clean on
`audit/production-readiness-2026-08-18` at `94585b1` (it was).

**Finding: neither phase has any item an engineering session can execute.**
Phase 6 (`remediation-roadmap.md`'s "External verification / owner action")
is X1 ZATCA / X2 Neon / X3 Moyasar / X4 mandatory E2E — every one needs
either a credential/access this session doesn't hold (a Fatoora portal OTP,
Neon console access, Moyasar merchant KYC) or, for X4, both X1 and D8 first.
Phase 7 is the decision register, D1–D9, all nine still OPEN — and this
session's instructions explicitly prohibited resolving any of them
unilaterally, which implementing any listed option would do by definition.
Full per-item reasoning is in `docs/audit/remediation-ledger.md`'s new
"Phase 6 & Phase 7 outcome (2026-08-19)" section — not duplicated here.

**Verification performed anyway**, since "nothing to build" isn't the same
as "nothing to check": all 5 CI gates re-run fresh — lint (0 errors), `npm
audit --audit-level=critical` (7 high / 0 critical, same as every prior
phase), `npx tsx scripts/validate-zatca.ts` (7/7 PASS), `npm run build`
(clean) — and the full 87-file regression suite re-run under the same
two-group convention as Phases 3–5 (6 schema-pushing files separately, 81
together with `--no-file-parallelism`). Result: **575/575 passed, 0 failed,
0 skipped** — the exact Phase 5 baseline, reproduced, not assumed.

**One process note for whoever runs this next**: the first attempt at the
81-file batch was started in the background while a schema-pushing file was
then started in the foreground — both against the live `fatoora_audit` at
the same time. That produced a real `db push --force-reset` failure (a
`Subscription_companyId_fkey` violation from the two processes racing each
other's schema-drop and data-write). This is the same "don't run the
6-schema-pushers and the 81-batch concurrently" rule §3 of this file already
states — this session's mistake in applying it, not a new discovery. Stopped
the background run, re-sequenced strictly (6 files one at a time, then the
81-file batch alone), and the re-run was clean throughout. No production
code was implicated.

**Nothing was implemented.** No code, schema, or ledger status changed. The
only artifacts of this session are documentation: this section, the
corresponding section in `docs/audit/remediation-ledger.md`, and an update
to `START-HERE.md`'s current-state summary — committed separately from any
future Phase 6/7 engineering work, since there was none to bundle it with.

**Next session**: this scope check doesn't need re-doing until something
upstream moves — an owner action on any of X1–X3 (X4 needs X1 and D8 both),
or an owner decision recorded in `decision-register.md` for any of D1–D9.
If neither has happened, re-running "Phase 6 and Phase 7" will reach the
same conclusion; start from `docs/audit/remediation-ledger.md`'s "Phase 6 &
Phase 7 outcome" section instead of re-deriving it.

---

## 8. D1–D9 decision implementation (2026-08-19, separate follow-up session)

Later the same day as §7's scope-check, the owner reviewed a
decision-readiness table and explicitly locked all nine decisions. This
session read `START-HERE.md`, the roadmap, the ledger, the decision
register, and this file first, verified `git status` clean, then
implemented every approved option — **decisions, not invented
requirements**: every choice below traces to an owner instruction, not an
engineering judgement call.

**What was built, one paragraph each — full detail (files, tests,
rationale) lives in `docs/audit/decision-register.md`, not repeated here:**

- **D1 (Option C)** + **D9 (Option B)**, done together since both touch the
  same aggregation code: `GET /api/reports` now returns both a
  "declarable" (every issued invoice) and "cleared" (ZATCA-cleared only)
  VAT figure, and both are net of credit/debit notes via a new shared
  helper (`lib/zatca/reconciliation.ts`) that replaced three separately-
  wrong summation sites. This closes a **currently-live** correctness bug
  — a credit note previously inflated the VAT return instead of reducing
  it — not a hypothetical one.
- **D2 (Option B)**: `POST /api/invoices` attaches a non-blocking warning
  when an invoice is dated into an already-elapsed reporting month. No
  period lock exists or was authorized.
- **D3**: verified, not implemented — checkout was already OFF and no
  price was invented; the owner's chosen state was already the actual
  state.
- **D4 (Option A)**: every remaining placeholder across the seven legal
  pages replaced with real draft text grounded in this codebase's actual
  data practices. DRAFT banners kept and reworded to say "drafted, not
  reviewed by counsel" — never represented as legally approved.
- **D5 (Option A)**: `docs/audit/adr-001-hybrid-architecture.md` — the
  architecture decision this app already embodies, written up, changing
  nothing.
- **D6 (Option C)**: real, adversarially-tested Postgres RLS on
  Invoice/Customer/Product/Certificate (`prisma/migrations/
  20260819100000_row_level_security`, `lib/db/rls-client.ts`) — but
  **deliberately not wired into the app's actual runtime client**. Forcing
  RLS onto the owner role every existing query already uses would have
  broken the whole application and this entire test suite the instant it
  landed, since the safe precondition the original recommendation named
  (W17 separating prod/dev — still X2/owner-blocked) hasn't happened. What
  exists is a proven, opt-in primitive (`queryAsTenant()`), not yet adopted
  anywhere. Applied only to `fatoora_audit`, never `neondb`.
- **D7 (Option C, not B)**: `GET /api/operator/companies` — read-only,
  cross-tenant, gated by the same `OPERATOR_SECRET` pattern as W6's global
  RAG re-index, every read audited. The full Customer Control Center (N1)
  and everything depending on it (N2/N5/N9/N11) remain BLOCKED — Option C
  does not unlock them.
- **D8 (Option A)**: `lib/whatsapp/send.ts` + `POST /api/invoices/:id/
  whatsapp` — Meta WhatsApp Business Cloud API, document media upload
  followed by an approved-template message, same anti-abuse recipient
  design as N7's email route. Feature-flagged OFF by default. **No
  production send has been verified** — Meta Business verification and
  template approval are owner-only actions, still pending; only the mock
  path and deterministic injected-fetch unit tests have run.

**Verification, exact numbers:**

- All 5 CI gates green: `npm run lint` (0 errors), `npm audit
  --audit-level=critical` (7 high / 0 critical — unchanged baseline),
  `npx tsx scripts/validate-zatca.ts` (7/7 local checks), `npm run build`
  (clean), full regression suite.
- Full regression: **93 test files, 612 tests, 0 failed, 0 skipped** (6
  new files since §7's 87: `lib/zatca/reconciliation.test.ts`,
  `app/api/invoices/past-period-warning.test.ts`,
  `app/api/operator/companies/route.test.ts`, `lib/db/rls.test.ts`,
  `lib/whatsapp/send.test.ts`, `app/api/invoices/[id]/whatsapp/
  route.test.ts`). Same two-group convention as every phase since Phase 3:
  6 schema-pushing files run separately (39/39), the other 87 run together
  with `--no-file-parallelism` (573/573).
- **Three genuine timeout failures were found and fixed during this
  session's own final-regression runs** (not pre-existing, surfaced by
  running the full 87/93-file batch, which takes 13-14 minutes
  sequentially — not by running any file in isolation): `app/api/health/
  deep/route.test.ts` (pre-existing, unrelated to this session's edits —
  the first real invocation of a route that makes an outbound ZATCA call
  pays a cold-start cost the next identical call doesn't), `lib/db/
  rls.test.ts` (2 tests, this session's own new file), and `app/api/
  invoices/[id]/send/route.test.ts` (pre-existing, unrelated). All three
  are the same class of measured Neon/network connection-latency variance
  under sustained sequential load already documented for this programme
  (Phase 4's `plan.test.ts` case). Fixed with explicit `20_000`ms test
  timeouts, evidenced by reproduction across multiple full-batch runs — not
  applied blindly. One of the three also had a real code-level cause
  worth fixing on its own merits: `lib/db/rls-client.ts`'s `queryAsTenant`
  used Prisma's default interactive-transaction `maxWait` (2s), which
  failed outright once under load; raised to 15s/20s, mirroring
  `issueInvoice()`'s own already-documented override for the identical
  reason.

**Commits this session** (branch `audit/production-readiness-2026-08-18`,
on top of §7's `7f8b59c`): `6b6a623` (D1+D2+D9), `bb68080` (D5+D7),
`917331d` (D6), `8685d92` (D8), `7b00972` (WhatsApp typecheck fix),
`b90000a` (D3+D4), `a1315f5` (regression timeout fixes). Working tree
clean afterward. Not pushed to `main`.

**Not done, honestly**: D6 is a tested mechanism, not an app-wide
protection — adopting `queryAsTenant` at real call sites is the natural
next increment. D8's WhatsApp path has never sent a real message. D4's
pages are drafted, not legally reviewed. None of Phase 6's X1–X4 moved
(still owner-blocked, unaffected by this session). N1 (full Control
Center) and its dependents (N2/N5/N9/N11) remain BLOCKED — D7 explicitly
did not authorize building them.

**Next session**: nothing in Phase 6/7 is left to decide or implement.
Next engineering-executable work is either owner-triggered (any of
X1–X3, Meta Business verification for D8, legal review for D4) or a new
increment the owner explicitly requests (e.g., adopting `queryAsTenant` at
a first real call site). Do not start a new phase without being asked.

---

## 9. 48-hour launch-readiness pass (2026-08-19, third session this day)

Explicit P0/P1-only scope: no new features, no polishing. Read the current
state (this file, ledger, register, START-HERE) fresh, confirmed
`git status` clean at `8a5371b`, re-ran all 4 non-DB CI gates fresh (lint,
audit, ZATCA validate, build — all green, unchanged), and treated the
last full regression (§8's 612/612) as still valid since nothing had
changed since it ran.

**P0 queue (2 items) — both DONE:**

1. Baseline gate re-verification (above).
2. `docs/18-production-checklist.md` — the owner-facing pre-deploy doc —
   was dated 2026-08-05 and had never been touched by any remediation
   phase (W20's doc-reconciliation pass covered other files, not this
   one). It actively misstated current reality: wrong branch name, wrong
   test count, two "open gaps" that were fixed phases ago (audit trail —
   W2; branch scoping — W10), bulk import listed as unbuilt when N4
   shipped it, no mention of the three new `WHATSAPP_*` env vars or the
   Meta Business blocker, legal copy described as raw brackets when D4
   already drafted real text. Rewritten to match actual current state.
   Commit `fa6b22d`.

**P1 queue: none found actionable.** Checked and explicitly deferred, all
for the reason "high implementation risk and not required for launch,"
per this session's own instruction:

- RLS app-wide adoption (D6) — stays an opt-in, unused-in-production
  mechanism. Retrofitting it into the main app client risks
  `issueInvoice()`'s chain-critical transaction; not attempted.
- Operator-route rate limiting — would be inconsistent with its own
  reference pattern (`/api/ai/ingest`, unrated since Phase 2) and the
  credential is brute-force-infeasible regardless. P2.
- W25's backup/restore drill — `pg_dump`/`pg_restore` confirmed still
  absent from this environment (checked again, not assumed). Installing
  DB client tools mid-crunch is exactly the kind of tangent this session
  was told to avoid; the documented logical-backup procedure plus
  `migration-drill.ts`'s tested restore-equivalent already stand.
- `bench-concurrent.ts` (unrun performance validation at 20k-invoice
  volume) — the underlying correctness mechanism (the `FOR UPDATE` row
  lock) is architecture-invariant regardless of table size and already
  proven correct at small scale (`clearance-crash.test.ts`, the original
  audit's 8-concurrent-issue check). This would measure throughput
  headroom, not fix a correctness gap — P2.

**No code changed this session — documentation only.** Working tree clean
at `fa6b22d`. All 5 CI gates green (4 re-run fresh, vitest's 612/612 carried
forward from §8 since untouched).

**Next session**: same as §8's closing note — nothing further is
actionable without an owner action or an explicit new request. If asked to
continue "launch readiness" again without new owner input, re-deriving
this same P0/P1 queue will reach the same conclusion; start from this
section instead.

---

## 10. OpenWA — temporary interim WhatsApp transport (2026-08-19, fourth session this day)

Owner directed a change to D8's *implementation* (not the decision itself,
which stays "WhatsApp required for launch," unchanged): stop spending time
on Meta Business verification for now, and use OpenWA
(https://github.com/rmyndharis/OpenWA), a self-hosted WhatsApp gateway, as
a temporary transport behind the same interface, kept low-cost. Read
before writing any code: OpenWA's own `docs/06-api-specification.md`
(fetched from the repository — endpoints below are quoted from it, not
guessed), the existing Meta implementation, the email delivery route (N7,
the pattern this mirrors), the feature-flag system, and the audit-event
mechanism.

**IMPORTANT, repeated everywhere this touched: OpenWA is not, and must
never be documented as, the final recommended production/compliance-grade
WhatsApp integration.** It connects via reverse-engineered WhatsApp
clients, not Meta's official API; its own docs warn of a real account-ban
risk and say to treat it as "not approved" for regulated sectors. Meta's
Cloud API remains the intended production path — see
`docs/audit/decision-register.md` D8's addendum for the full framing.

**Architecture — reused, not duplicated:**

`lib/whatsapp/send.ts` changed from a Meta-specific sender into a thin
dispatcher. Two provider modules now sit behind it:
- `lib/whatsapp/providers/meta.ts` — the prior implementation, moved
  unchanged (same two-step upload-then-template flow).
- `lib/whatsapp/providers/openwa.ts` — new. `POST /sessions/:sessionId/
  messages/send-document` (PDF sent as base64, never a fetchable URL —
  nothing here should let OpenWA, or anyone who compromises it, pull an
  invoice PDF on demand) and `GET /sessions/:sessionId` for session
  status. Chat IDs are OpenWA's documented `<digits>@c.us` shape, no
  leading `+`, converted from the stored `Customer.phone`.

Selection order in the dispatcher: an explicit `WHATSAPP_PROVIDER`
override, else Meta if its three env vars are all set (compliance-grade
always wins automatically the moment it's configured — migrating off
OpenWA later needs zero code changes), else OpenWA if its three env vars
are all set, else mock (unchanged "never crash, log instead" posture).

`app/api/invoices/:id/whatsapp/route.ts` needed exactly **one line**
changed — a new provider-agnostic `isWhatsAppProviderConfigured()` instead
of a Meta-specific env check. Recipient resolution (`Customer.phone`
only, never the request body), tenant scoping, authorization, the
`whatsappInvoiceDelivery` feature flag, rate limiting, and audit logging
via `recordSecurityEvent` were **not touched** — reused exactly as they
were, per the explicit instruction not to duplicate any of them.

**New operator surface**: `GET /api/operator/whatsapp-session` — read-only
provider/session health (configured? available? which provider?), gated
by the same `OPERATOR_SECRET` bearer pattern as D7's `/api/operator/
companies` and W6's global re-index. Never returns the API key, the
paired phone number, or a QR code. Session creation and QR pairing are
deliberately **not** built into this app — OpenWA ships its own dashboard
(default `http://localhost:2785`) for that one-time, interactive, human
task; building UI for it here would have been the "elaborate WhatsApp
management dashboard" the instructions explicitly said not to build.

**New env vars** (all optional, documented in `.env.example`):
`OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID`,
`WHATSAPP_PROVIDER`. No secret committed — no real OpenWA instance was
configured or available this session.

**Tests, all against an injected mock `fetch`, none requiring a real
WhatsApp account or a running OpenWA instance** (per the explicit
instruction): `lib/whatsapp/providers/openwa.test.ts` (10 — payload shape
against OpenWA's documented contract, chatId conversion, non-2xx handling,
"never claims success without a confirmed messageId," API key never
appears in a logged or thrown value, session-status mapping including
network-failure and non-`ready` cases), `lib/whatsapp/send.test.ts` (12
total — 6 pre-existing Meta-path tests, one updated for a legitimate
interface addition — a `provider` tag on the result — not weakened, plus 6
new provider-selection-order tests), `app/api/operator/whatsapp-session/
route.test.ts` (5 — authorization, status reporting, no-secret-leak). One
pre-existing test file's module mock (`app/api/invoices/[id]/whatsapp/
route.test.ts`) needed `isWhatsAppProviderConfigured` added to its
`vi.mock` factory, since the route now imports it too — caught by running
the tests, not guessed.

**Verification**: lint 0 errors; `npm audit --audit-level=critical` 7
high/0 critical (unchanged baseline); `validate-zatca.ts` 7/7; build clean
(new route confirmed present in the route manifest); full regression — 95
test files (up from 93), 6 schema-pushing run separately (39/39), the
other 89 together with `--no-file-parallelism`. **639 total tests, 95
files, 0 failed, 0 skipped.**

One genuine infra blip during the ~13-minute batch run, diagnosed rather
than papered over: two files' `beforeAll` hit `PrismaClientInitializationError:
Can't reach database server` (a full connection failure, not a query
timeout) and one pre-existing, unrelated file (`lib/ai/
confirmation.test.ts`) hit vitest's 5s default. None of the three touch
WhatsApp/OpenWA. Checked reachability immediately after: `fatoora_audit`
answered a trivial `select 1` in ~4.1 seconds — far slower than a warm
connection, consistent with Neon's free-tier compute having auto-suspended
after the earlier idle gaps in this session and needing to cold-start on
the next query. Re-ran the three affected files in isolation once warm:
14/14 passed immediately, no code touched. **No timeout was changed** —
this was root-caused as transient infrastructure latency, not a defect,
per the explicit instruction to distinguish the two before acting.

**Not done, honestly**: no real send verified through either provider —
Meta stays owner-blocked on Business verification (deferred, not
attempted); OpenWA had no running instance available to test against in
this environment, so its correctness is proven against the documented API
contract via mocks, not a live gateway. If a local OpenWA instance becomes
available without placing credentials in chat, run the mocked tests first
(already green) and only then attempt one real send — not done this
session for that reason.

**Commits**: `aa36b7b` (feat — OpenWA implementation, code + tests), plus
this documentation commit on top.

**Next session**: if a real OpenWA instance and session become available,
the natural next step is one real, manually-verified send (not
automated — per the instructions, this should happen only after the
mocked tests are green, which they are). Otherwise nothing further is
actionable without an owner action.

---

## 11. X2 Neon verification + final production-readiness check (2026-08-19)

Read-only pass. **No application code was modified** — the only changes are
this section and the ledger's new "X2 verification" table.

**X2:** 6 of 12 checks verified directly against the production database;
3 are console-only and remain owner-blocked; 1 (retention) is
owner-reported and unconfirmed here. Full per-check table with evidence is
in `docs/audit/remediation-ledger.md` — not duplicated. Two findings worth
carrying forward:

1. **Prod/test share one Neon compute.** `neondb`, `fatoora_audit`,
   `fatoora_restore` and `postgres` all sit on endpoint
   `ep-frosty-bar-ajlzdhux`. The W17 separation gap is now confirmed
   rather than suspected, and the concrete consequence is that a
   *branch-level* PITR restore would act on all four at once.
2. **One migration is genuinely pending on production**:
   `20260819100000_row_level_security` (D6). Deliberately **not applied** —
   modifying `neondb` requires per-action owner approval, and it is
   already step 4 of the documented deploy sequence. Verified
   non-breaking: RLS reads `false` on all four target tables in prod
   today, and D6's migration is additive by design.

**Live deployment — the significant finding of this pass.**
`https://fatooralite.vercel.app` is up and healthy: `/api/health` 200
(`database: connected`, `environment: production`), `/api/invoices`,
`/api/flags`, `/api/companies`, and both `/api/operator/*` routes all 401
unauthenticated, `/dashboard` 307 → login. Auth boundaries behave
correctly.

**But it is running stale code.** Its `/terms` page still serves the
`[Placeholder: describe how using…]` text that D4 *replaced* this session.
Since this branch has never been pushed (the branch does not exist on
`origin`; `main` is 28 commits behind), the deployed build predates the
entire D1–D9 decision implementation, the OpenWA work, and the D4 legal
drafts. **Nothing on that live site reflects the remediation programme.**
Treat the live URL as the old product until a deploy happens.

**Config cross-check** (local `.env`, names only — Vercel's production
environment is separate and unreadable here, CLI logged out): required
`CRON_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_URL` are **absent locally**, as
is `OPERATOR_SECRET` (which correctly makes both operator routes fail
closed). These are not local defects — they are the Vercel-side variables
blocker #7 of `docs/18-production-checklist.md` already names. `AUTH_SECRET`
is 44 chars (over the 32 minimum), `AUTH_ENFORCE` is literal `true`,
`ZATCA_MODE` is `sandbox` — all correct for a non-production machine.

**Tests/gates:** none re-run, deliberately. No application code changed,
so per this pass's own instruction the 639-test suite was not re-executed;
the last full green run (§10) stands unchanged.

---

## 12. CLI access granted, production actually deployed (2026-08-20)

The owner authenticated `gh`, `vercel`, and `neonctl` on this machine
(each via its own device-flow/browser login, done by the owner — this
session cannot complete OAuth itself) and explicitly authorized working
live. What follows actually happened, in order.

**X2 fully resolved except one item.** `neonctl` answered what §11's
read-only pass could only mark "owner action required": plan is **Free**,
retention is **21600s = 6h exactly** (matches the owner's earlier report,
now independently confirmed rather than trusted), self-service PITR
restore is real (`neonctl branches restore <target> <source>@<ts|lsn>`,
confirmed via `--help`, not executed since nothing needed restoring).
Project/branch identity confirmed: `fatooralite`
(`lingering-pine-81021509`), branch `main` (`br-damp-leaf-ajeiikbz`,
`ready`); a `test` branch exists but is `archived`. Only
**encryption-at-rest** has no API answer anywhere — genuinely
console/vendor-doc-only. Full detail in `docs/audit/remediation-ledger.md`'s
X2 section.

**The pending D6 migration was applied to `neondb`.** 19/19 now current.
Verified immediately after: `relrowsecurity=true`/`relforcerowsecurity=false`
on all four tables (exactly as designed), the app's own connection still
reads `Invoice` normally, `/api/health` stayed 200 throughout. No
regression.

**Production was actually deployed** (`vercel --prod`, aliased to
`fatooralite.vercel.app`) — twice. The first deploy surfaced a real bug,
found only by testing the live site, not by any of the 639 tests:

**`proxy.ts` was silently blocking both operator routes in production.**
It gates every `/api/*` path behind a session cookie unless explicitly
exempted (the same file already exempts `/api/cron` and
`/api/billing/webhook` for the identical reason — they authenticate via
their own bearer/shared-secret check, not a cookie). `/api/operator/*`
was never added to that exemption, so `GET /api/operator/companies` and
`GET /api/operator/whatsapp-session` died at the proxy with a generic 401
before their own `OPERATOR_SECRET` check ever ran — for every caller,
correctly-credentialed or not. Every existing test imports and calls the
route handler directly (`import("./route")`), which bypasses `proxy.ts`
entirely, so nothing in the suite could have caught this; it only showed
up testing the real HTTP path. Fixed the same way the file's own
`/api/cron` precedent is written: added `/api/operator` to the exemption
list, with a comment explaining why. Two new regression tests in
`proxy.test.ts` prove the proxy no longer intercepts these paths with its
own 401; all 16 pre-existing proxy tests and both operator-route test
files re-run unchanged and green (28 tests total). Lint and build clean.
Commit `605f029`.

**Also found and fixed along the way:** the `OPERATOR_SECRET` value set in
§11 turned out impossible to verify by the method used
(`vercel env pull`) — Vercel deliberately redacts Sensitive-typed values
in a pulled `.env` file with a placeholder, confirmed by checking a
long-standing, definitely-correct pre-existing secret (`CRON_SECRET`) the
same way and seeing the identical redacted shape. Not a real bug in what
was stored; a bug in how it was being checked. Re-verified properly this
time — generate, confirm length locally (44 chars), set via `vercel env
add --value` (not stdin, which truncated unpredictably under this
shell — a real, reproducible quirk worth remembering, not explained
further), redeploy, then test the live endpoint directly with the value
still in shell scope, never round-tripped through `pull`. Both operator
routes now return real 200s with a correct credential and their own
403 with a wrong/missing one, confirmed live.

**`GET /api/operator/whatsapp-session` in production correctly reports
OpenWA as unavailable** (`{"provider":"openwa","configured":true,
"available":false,"error":"fetch failed"}`) — expected, not a bug.
`OPENWA_API_URL` points at `127.0.0.1:2785`, this machine's own OpenWA
instance, which Vercel's serverless functions cannot reach. This was
predicted before any of this session's live work and is now confirmed
rather than assumed. WhatsApp delivery in production is Meta-or-nothing
until OpenWA is hosted somewhere Vercel can reach — a decision not made
this session.

**Not done: the branch has still not been pushed to GitHub.** `git push`
itself is no longer blocked by Claude Code's sandbox classifier (it
wasn't this session), but `gh`'s OAuth token lacked the `workflow` scope,
which GitHub requires to push any change touching
`.github/workflows/ci.yml` (one of this branch's 29 commits does). A
`gh auth refresh -h github.com -s workflow` was started and needs one more
owner click to approve — pending as this section is written. Once
approved, the push is expected to succeed immediately (everything else
about the push path is already confirmed working: credentials wired via
`gh auth setup-git`, `GIT_TERMINAL_PROMPT=0` set so nothing hangs waiting
for input again).

**Commits this session:** `605f029` (proxy fix) on top of `ac4229e`. Not
yet pushed — see above.

**Next session, if the push still hasn't happened:** finish `gh auth
refresh`, then `git push -u origin audit/production-readiness-2026-08-18`.
Everything else — X2, the migration, the live proxy fix, `OPERATOR_SECRET`
— is done and verified; don't re-derive any of it from scratch.

---

## 13. Push completed, CI fixed, PR opened, main protected (2026-08-20)

The `workflow`-scope refresh from §12 timed out once (device code expired
before approval — my wait window was too short, not a real failure) and
succeeded on retry. Push landed: 31 commits, branch matches `origin`
exactly (`0794dcf` at that point).

**GitHub's own repo page then showed `main`'s latest check failing.**
Investigated rather than assumed: the failure was on `main`'s actual HEAD
commit (`95ac6fa`, 2026-08-06) — **`main` has not been updated since**;
none of this entire remediation programme has ever been merged. Root
cause: the `Unit tests` CI step had no `AUTH_SECRET`/`DATABASE_URL`
placeholders, so `lib/env.ts`'s `validateEnv()` (pulled in transitively by
most service files) threw at module-import time before any test could
run. Fixed in `.github/workflows/ci.yml` (commit `7240cf9`) — turned out
partially redundant: `vitest.config.ts` already carries the identical
fallback, added 2026-08-18 (`1c93593`), which simply never made it to
`main` either. Left the `ci.yml` fix in anyway as harmless belt-and-braces
matching the `Build` step's existing pattern, but recorded honestly here
rather than overclaiming it as the whole fix.

**Opened PR #16** specifically to trigger CI via `pull_request` (the
workflow only listens to `push:main` and `pull_request`, never a plain
branch push) and verify locally-unverifiable changes for real. First run
surfaced a second, genuine, different bug: `app/api/health/deep/
route.test.ts` had two tests that call the real route handler
end-to-end — unlike every other DB-touching test in this codebase, they
were never gated behind `hasTestDb`, so they only ever passed locally
because a real `DATABASE_URL` was always configured. CI's is an
intentional non-connecting placeholder. Fixed (commit `c953798`): split
into two `describe` blocks — the three auth-gate tests (no DB touched)
stay unconditional; the two success-path tests moved under
`describe.skipIf(!hasTestDb)`, the codebase's own established convention.
Verified both modes locally before pushing (with and without
`TEST_DATABASE_URL`).

**Second PR run: fully green** — lint, audit, unit tests, ZATCA
validation, build all passed (`32327003639`, 2m3s).

**`main` branch protection enabled**, per the owner's direct request and
matching `docs/18-production-checklist.md`'s own long-standing
recommendation: PR required before merge (0 reviewers — solo repo, so this
forces the workflow without demanding a second person), `lint · test ·
build` required and must be current with `main` (`strict: true`), force-push
and branch deletion blocked. `enforce_admins: false` — the owner can still
bypass in a genuine emergency; this isn't a lockout.

**Not done, deliberately: PR #16 was not merged.** Every prompt this whole
session said not to touch `main`; opening/fixing/protecting are all
reversible and don't touch `main`'s content, merging does. That decision
was left for the owner explicitly.

**Commits this session, in order:** `605f029`, `0794dcf`, `7240cf9`,
`c953798` — all on `audit/production-readiness-2026-08-18`, all pushed,
all included in PR #16.

---

## 14. PR #16 merged to main (2026-08-20)

**Supersedes §13's "PR #16 was not merged" note** — the owner reviewed
and approved the merge in a follow-up step the same day.

PR #16 merged via merge commit `69dca91`, 2026-08-20 03:27 UTC. `main`
was stuck at `95ac6fa` (2026-08-06) until this merge; it now carries all
31 commits of the remediation programme — Phases 1–7, all nine D1–D9
decisions, the OpenWA interim WhatsApp transport, the production `proxy.ts`
operator-route fix, and the CI env-var fixes from §13. Branch protection
(PR required, `lint · test · build` required and current, no force-push)
held through the merge as designed — no admin bypass was used.

**This does not, by itself, change what's live.** Vercel is not
git-connected to this repo (confirmed since the original 2026-08-06
release — see `START-HERE.md`'s "Previous state"), so merging to `main`
triggers nothing on Vercel's side. The production deploy from §12
(`vercel --prod`, same day) already carries this exact code, so
`fatooralite.vercel.app` and `main` are now in sync by coincidence of
timing, not by a deploy hook. If `main` is ever git-connected to Vercel
later, a push to `main` would then auto-deploy — it doesn't today.

**Updated to match:** `docs/18-production-checklist.md` row 7 ("nothing
is pushed"), `docs/16-launch-plan.md`'s branch-protection line and new
"Push, CI fix, PR #16, branch protection, merge" section, `handoff.md`'s
2026-08-20 entries, `START-HERE.md`'s current-state summary.

**Next session:** nothing left to push or merge from this programme.
Remaining work is exactly what `START-HERE.md`'s "Blocked on the owner"
and "What is left" sections already say — owner-gated verification
(Fatoora OTP, Moyasar KYC, Meta Business/legal review) or a new
engineering increment explicitly requested, not a re-run of this
push/merge sequence.

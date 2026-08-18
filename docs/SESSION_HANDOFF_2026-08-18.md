# Session handoff — 2026-08-18 (Remediation Phase 3)

**Read this first if you're picking up this session cold.** It's the exact
current state, not a summary of intentions. `START-HERE.md` points here.

---

## 1. Where things stand

| | |
|---|---|
| Branch | `audit/production-readiness-2026-08-18` |
| Latest commit | `1c93593` (Phase 2) — **Phase 3's work is NOT committed yet**, see §4 |
| Phase 2 | **COMPLETE**, committed as `1c93593`. 447 passed / 2 pre-existing failures / 0 skipped at the time. Ledger: 507 GREEN / 1069 |
| Phase 3 | **COMPLETE and fully verified.** All 12 planned items (W8–W18, N8) delivered with evidence; F-A/F-B/F-C investigated and closed; one additional real bug (a test race condition, not in F-A/B/C's original scope) found and fixed during final verification. Full regression: **73 test files, 497 tests, 0 failed, 0 skipped** |
| Never do | modify `neondb` · drop `fatoora_audit`/`fatoora_restore` · migrate to Supabase · push to `main` · start Phase 4 without reading this file |

## 2. Test verification — done, this is the final result

The full suite (73 test files) had to be split into two run groups this
session because of a real, diagnosed constraint (§3.3 below): **6 files**
that call `pushTestSchema()` must run alone/separately from each other; the
other **67 files** must run together but with `--no-file-parallelism`
(running them in true parallel causes real connection contention against
`fatoora_audit`, not a code bug — see §3.1).

**Final confirmed result, both groups:**
- The 6 schema-pushing files: **39/39 passing**
  (`lib/ai/vector-store.test.ts`, `lib/auth/server.test.ts`,
  `lib/billing/plan.test.ts`, `lib/db/repo.test.ts`,
  `lib/services/clearance-service.test.ts`,
  `lib/services/invoice-service.test.ts`).
- The 67-file batch: **458/458 passing** (confirmed on the run that included
  every fix below — three earlier runs surfaced real issues that got fixed,
  not suppressed; see §3.2 and §3.4).
- **Total: 497/497, 0 failed, 0 skipped.** This includes the 2 tests that
  were failing at Phase 2's baseline (`lib/billing/plan.test.ts`,
  now fixed by F-A) — so Phase 3 ends with strictly fewer known issues than
  it started with, not more.

**Nothing left to run.** If you're re-verifying from a fresh session (e.g.,
after further changes), see §5 for the exact commands and the two gates
you'll hit running them.

## 3. Root causes — so you don't re-diagnose any of this

### 3.1 — the 67-file batch must use `--no-file-parallelism`

Running all 67 non-schema-pushing DB-gated files in true parallel (vitest's
default) caused real connection contention against `fatoora_audit` —
21 tests failed with exact 5000ms timeouts, and 8 more (in
`branch-scoping.test.ts` and `app/api/ai/ingest/route.test.ts`) failed with
fast, wrong-looking `401`s that were actually cross-file fixture
interference under concurrency, not an auth bug. Re-running the identical
files serialized (`--no-file-parallelism`) made all 8 of the 401s disappear
immediately — confirming they were never a real auth defect.

### 3.2 — ~24 tests were hitting the exact 5000ms vitest default, and needed real explicit timeouts

Even serialized, ~24 pre-existing (and some new, W16/W18/N8) tests still hit
the exact 5000ms default — never wildly over it (5000–5025ms in almost every
case). This is the signature of "genuinely slower than the budget, not
stuck": sibling tests in the same files doing equal-or-more DB round trips
passed comfortably at 3000–4300ms, and every affected test does a small,
fixed, genuinely-sequential chain of DB round trips (issue → sign → submit →
reconcile-style — each step depends on the previous step's generated
id/hash; correct test structure, not an antipattern like F-A's
sequential-insert loop). Fixed by adding an explicit timeout (`20_000` for
most, `25_000` for one) as the third argument to each specific `it(...)`
that showed evidence of needing it — the same pattern
`lib/ai/vector-store.test.ts` already used (`60_000`) before this session
touched anything. Nothing was timeout-bumped speculatively; every bump
followed an actual observed 5000ms-wall failure for that specific test.

**If Neon latency is simply worse in a future session** and more tests start
hitting even these raised ceilings, that is real information about current
conditions, not a reason to keep raising numbers indefinitely — investigate
whether it's transient or a genuine regression before bumping further. And
see §3.4 before assuming a stubborn timeout is just latency — it might not be.

### 3.3 — only 6 files call `pushTestSchema()`, and they must run alone

`lib/ai/vector-store.test.ts`, `lib/auth/server.test.ts`,
`lib/billing/plan.test.ts`, `lib/db/repo.test.ts`,
`lib/services/clearance-service.test.ts`,
`lib/services/invoice-service.test.ts` each call `pushTestSchema()`
(`prisma db push --force-reset`) in their own `beforeAll`. Two of them
running together — even with `--no-file-parallelism` — race, because each
one independently resets the entire schema and two resets against the same
database corrupt each other. Run each of the 6 in its own separate `vitest
run` invocation.

### 3.4 — one of the ~24 "timeouts" was actually a real race-condition bug in the test, not latency

`lib/services/clearance-crash.test.ts`'s concurrent-submission test kept
failing at almost exactly whatever timeout ceiling it was given (5000ms,
then 20007ms, then 30011ms) — landing within ~11ms of the ceiling every
time is NOT the signature of "just slow," it's the signature of an actual
stall that vitest's own timeout is terminating. Confirmed with temporary
`console.log` timing instrumentation (add it back the same way if you ever
need to re-diagnose something like this: wrap each promise with
`.then(onFulfilled, onRejected)` handlers that log elapsed time, run once,
read the log, remove the instrumentation).

The real bug: the test fired two concurrent `submitInvoice()` calls 50ms
apart and *assumed* the one issued first in JS would always win the atomic
CAS claim in the database — but arrival order at Postgres isn't guaranteed
to match call order in JS under real network latency. When the second call
actually won the race (confirmed happening via the logs), it got stuck
waiting on a gated mock gateway call that the test only released *after*
the (wrongly assumed) loser rejected — which never happened for the actual
winner. A genuine deadlock, reproduced 3/3 in complete isolation
(`npx vitest run lib/services/clearance-crash.test.ts`), unrelated to the
67-file batch. The production CAS invariant itself was never broken — only
the test's assumption about *which* caller wins.

Fixed by not assuming who wins: fire both calls concurrently, use
`Promise.race` over labelled settle-handlers to find out which one actually
rejected first, assert that one is the loser, release the gate
unconditionally, then assert the other resolved as the winner. Verified
reliable across 3 consecutive full-file runs post-fix (7/7 passing each
time). Checked the rest of the suite for the same `setTimeout(50ms)` +
gated-promise pattern (`grep` across every test file) — one other instance,
`lib/services/reconcile.test.ts`'s "two overlapping reconciler ticks" test,
was already structurally immune (it releases the gate unconditionally and
asserts on the *sum* of both outcomes, never on which specific call did
what).

**The lesson for future sessions**: a test failure that keeps landing
suspiciously close to *whatever* timeout you set, across multiple different
timeout values, is a signal to stop raising the number and actually
instrument it — that pattern means something real is stuck, not slow.

## 4. What's uncommitted, and what to do about it

Everything from this Phase 3 session is uncommitted. `git status` from the
repo root shows (paths relative to repo root):

Modified: `docs/02-architecture.md`, `docs/audit/2026-08-18-ledger.md`,
`docs/audit/decision-register.md`, `docs/16-launch-plan.md`,
`START-HERE.md`, `handoff.md`, and ~20 files under `fatooralite/` (services,
routes, components, `prisma/schema.prisma`, several `.test.ts` files).

Untracked (new): `docs/19-operations-runbook.md`,
`docs/audit/2026-08-18-performance-bench.md`,
`docs/SESSION_HANDOFF_2026-08-18.md` (this file), 9 new test files, 2 new
migrations (`20260818160000_check_constraints`,
`20260818170000_credit_debit_note_linking`), `lib/testing/`, `lib/time/`,
`scripts/migration-drill.ts`, `scripts/bench-concurrent.ts`.

The two scratch helper scripts this session used to run the DB-gated suites
(`fatooralite/scripts/_tmp-run-pushers.js`,
`fatooralite/scripts/_tmp-run-batch.js`) have already been **deleted** —
they were throwaway tooling (unescaped `require()` imports, fails lint on
purpose so they'd never accidentally ship), not meant to be committed. If
you need the same run pattern again, §5 has the exact commands to
reconstruct an equivalent script, or just run them inline.

**This session's remaining action, if it has turns left: commit.** No
further verification is needed first — §2 is the confirmed final result.

1. `git add` the real files (everything above — nothing needs excluding
   this time, the scratch scripts are already gone).
2. Review with `git status` / `git diff --stat` before committing — normal
   hygiene, not because anything specific is expected to be wrong.
3. Commit with a real, descriptive message — **no AI attribution** (no
   `Co-Authored-By`, no "Generated with", per `CLAUDE.md`). Do not push to
   `main`.

If a fresh session is reading this and the commit was never made, do it now
following the three steps above — there's nothing else blocking it.

## 5. Reconstructing the test-run commands (only needed for future re-verification)

```
cd "d:\gravity\FatooraLite(ZATCA)\fatooralite"

# The 6 schema-pushing files — run each SEPARATELY (see §3.3):
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/ai/vector-store.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/auth/server.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/billing/plan.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/db/repo.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/services/clearance-service.test.ts
npx vitest run --hookTimeout=90000 --no-file-parallelism lib/services/invoice-service.test.ts

# Everything else, together, serialized (see §3.1):
npx vitest run --hookTimeout=90000 --no-file-parallelism <every other *.test.ts/*.test.tsx path>
```

`DATABASE_URL`/`DIRECT_URL` must be set to the `fatoora_audit` DIRECT
(non-pooled) connection string for both groups (see `START-HERE.md`'s
invariant on this — pooled URLs break schema operations). Running the
schema-pushing group will hit Prisma's own AI-agent consent gate — see
`START-HERE.md`'s invariant on `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`
and Claude Code's own permission classifier, which independently blocks an
agent from supplying that consent itself or from self-granting a bypass
permission. **Never construct or print the actual connection string** —
verify the target database name programmatically (parse the path segment,
confirm it's exactly `fatoora_audit`) without echoing the credentials.

## 6. What's still open after this — not new work, just honest gaps

See `docs/audit/remediation-ledger.md`'s Phase 3 outcome section for full
detail. Summary:

- **W12** — full ZATCA XSD/Schematron validation stays blocked on **X1**
  (owner: Fatoora portal OTP access). What shipped is issue-time BR-KSA
  business-rule validation, a real but different thing.
- **W14** — concurrent-issuance-at-volume bench written
  (`scripts/bench-concurrent.ts`) but not run; RAG latency and 100-tenant
  load not measured (infra this session didn't have).
- **W15** — 3 new route tests added, not an exhaustive pass over all 17
  M-476–500 audit items.
- **W17** — the runbook is written; actually separating dev/prod `neondb`
  needs the owner's Neon console access (**X2**).
- **N8** — refund and cancellation flows stay MISSING (would require
  inventing a business rule); a new decision, **D9** (should credit notes
  subtract from VAT totals instead of adding?), is filed in
  `decision-register.md`, not resolved.

**Next session: start Phase 4**, or resolve D2/D6/D9 first if that's more
urgent than Phase 4's items for real customers. Do not start Phase 4 in the
same context as this one — same convention as every prior phase transition
in this programme.

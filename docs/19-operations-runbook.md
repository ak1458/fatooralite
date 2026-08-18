# Operations runbook — Fatoora Lite Pro

Phase 3 / W17. `docs/09-deployment.md` is the linear *first deploy* guide;
`docs/18-production-checklist.md` is the owner-facing pre-launch checklist.
This document is different: it's what to do once the thing is already live —
promoting a change, patching an emergency, recovering from a bad migration.
Cross-references the other two rather than repeating them.

---

## 1. Environment matrix

| Environment | Database | Purpose | Who touches it |
|---|---|---|---|
| Local dev | `neondb` (shared — see below) | Day-to-day development | Any session, `npm run dev` |
| `fatoora_audit` | Isolated Neon database, same project | Destructive testing, migration drills, benchmarks | Any session, freely resettable |
| Production | `neondb` (shared — see below) | Live customers | Deploy pipeline only |

**Standing gap, not fixed here:** production and local dev currently share
the same `neondb` database (recorded in `START-HERE.md` since the first
deploy). This is the single biggest operational risk in this matrix — a
local `db push --force-reset` or a careless seed script pointed at the wrong
`DATABASE_URL` can destroy live data. `fatoora_audit` exists specifically so
routine destructive testing never needs to touch `neondb` at all; every
Phase 2/3 migration and drill in this remediation programme ran against
`fatoora_audit` for exactly this reason.

**Separating them is an owner-executed action** (Neon console access is
required), not something a coding session can do. The checklist:

1. Create a second Neon project (or a branch of the existing one) for
   production.
2. Point Vercel's production environment variables (`DATABASE_URL`,
   `DIRECT_URL`) at the new project.
3. Run `npm run db:migrate` (`prisma migrate deploy`) against it — see §3
   below for the direct-vs-pooled URL requirement discovered this phase.
4. Verify with `GET /api/health/deep` (Phase 2/W4) before pointing real
   traffic at it.
5. Leave local `.env` pointed at the original `neondb`, now dev-only.

Until this happens, treat every local `db push`/`migrate` command as if it
could touch production, because — for `neondb` specifically — it can.

---

## 2. CI gates (reference, not duplicated from `.github/workflows/ci.yml`)

Five gates, in the order CI runs them — **lint gates the rest**; when lint
was red for an extended period in this project's history, `npm audit` and
`zatca:validate` silently never ran either (see `START-HERE.md`):

```
npm run lint → npm audit --audit-level=critical → npx vitest run
→ npx tsx scripts/validate-zatca.ts → npm run build
```

CI's `npm test` step has no `TEST_DATABASE_URL` configured, so all DB-gated
suites skip there by design — CI proves the code compiles, lints clean, and
the ZATCA signing pipeline is cryptographically sound; it does not exercise
the database-backed suites. Those only run when a session (or a future CI
secret) supplies `TEST_DATABASE_URL` pointed at `fatoora_audit`.

**Dependency-audit policy**: `--audit-level=critical`, not `high`, because
of two persistent advisory chains with no fix at any version — `adm-zip`/
`sharp` (via the optional `@huggingface/transformers` local-embedding
provider) and, as of Phase 3/F-B, `deepmerge-ts` via `@prisma/config` (the
`prisma` CLI's own dependency, not reachable from the deployed app — see
`docs/audit/2026-08-18-findings.md`). Raise the gate to `high` only once
those are resolved or the local-embedding provider is dropped (W24, Phase 4).

---

## 3. Migration process

**Roll-forward only.** This project has no rollback-migration convention —
recovering from a bad migration means restoring from backup (§5) or writing
a new forward migration that undoes the damage, never editing/deleting a
committed migration file.

**Use the DIRECT (non-pooled) connection URL for every schema operation** —
`prisma db push`, `prisma migrate deploy`, `prisma migrate dev`. This phase's
W13 drill root-caused a whole class of intermittent "table does not exist" /
advisory-lock-timeout failures to running these against the **pooled**
(pgbouncer) URL: pgbouncer's transaction-pooling mode doesn't reliably
support the session-level features (advisory locks, prepared statements)
schema operations depend on. The app's own runtime queries are fine against
the pooled URL — this only applies to schema-mutating commands. See
`handoff.md`'s Phase 3 entry for the full incident writeup.

**Pre-deploy rehearsal**: `scripts/migration-drill.ts` (new this phase) runs
a fresh-database migrate-deploy, an idempotency check, a transactional-DDL
failure/recovery check, and a larger-dataset check, entirely against
`fatoora_audit`. Run it before any migration that changes an existing
table's shape (not needed for a pure-addition migration like a new table):

```bash
export TEST_DATABASE_URL="<fatoora_audit DIRECT url>"
export PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<your own written consent — see the script's header>"
npx tsx scripts/migration-drill.ts
```

**Backup before a risky migration** (a column type change, a NOT NULL added
to a populated table, anything touching `Invoice`/`Certificate`): take a
manual Neon branch/snapshot from the console immediately before running
`migrate deploy` against production. Real Neon PITR/backup verification is
X2 (owner-blocked, needs console access) — until that's confirmed, treat a
manual pre-migration snapshot as the only recovery path that's actually been
verified to exist.

**Recovery from a genuinely failed `migrate deploy`** (interrupted mid-way,
not just a rejected statement — Postgres DDL is transactional per-statement,
so a rejected `ALTER TABLE` leaves the schema untouched, verified by the W13
drill): `prisma migrate resolve --rolled-back <migration-name>` marks it as
not-applied in Prisma's own migration-history table, then fix the migration
file and re-run `migrate deploy`. Never hand-edit
`_prisma_migrations` directly.

---

## 4. Release and rollback

**Vercel is NOT git-connected** (confirmed, `START-HERE.md`) — pushing to
GitHub does not deploy. Ship with:

```bash
cd fatooralite && npx vercel --prod
```

**App-code rollback**: `vercel rollback` reverts to a previous deployment
instantly — this is safe and fast because it only changes which built
bundle serves traffic, never the database.

**Database rollback is not a thing** — there is no down-migration
convention here (§3). "Rolling back the database" means restoring from a
backup/snapshot, which is a data-loss event for anything written since that
snapshot. This asymmetry (app code rolls back in seconds, database does
not) is why a risky migration needs a pre-migration snapshot, not a planned
down-migration.

**Version tracking**: semver tags on `main` (`v0.1.0`–`v0.4.0` as of this
writing), release/branching conventions documented in `handoff.md`'s
codebase-organization entry. Branch protection on `main` is confirmed unset
(`START-HERE.md`, "Blocked on the owner") — until it is, a force-push to
`main` is not blocked by GitHub itself, only by convention.

---

## 5. Emergency patching

1. Branch from `main`: `git checkout -b hotfix/<short-description>`.
2. Fix, with the smallest possible diff — an emergency patch is not the
   moment to also refactor.
3. Run the five CI gates locally before pushing (§2) — do not skip lint or
   the audit gate under time pressure; both have caused real incidents in
   this project's history when skipped (`START-HERE.md`'s "was failing for a
   long time" note on lint).
4. If the patch touches the database, it still goes through §3's process —
   an emergency is exactly when a mistake against `neondb` is least
   recoverable.
5. Deploy directly (`npx vercel --prod`), skipping the normal PR-review
   cadence only if the incident genuinely requires it — record afterward
   what was skipped and why.

**Secret rotation during an incident**: `ENCRYPTION_KEY` must never be
rotated independently of the database it's paired with (invariant,
`START-HERE.md`) — rotating it without re-encrypting every `Certificate` row
first makes every stored ZATCA private key permanently unrecoverable.
Rotating `AUTH_SECRET` invalidates every session (also documented) — safe,
but tell users to expect to log in again.

---

## 6. Dependency / security patch cadence

`npm audit --audit-level=critical` runs on every CI build; nothing here
mandates a separate cadence beyond "the gate is always green." When a new
advisory appears (as `deepmerge-ts` did during this phase — see F-B in
`docs/audit/2026-08-18-findings.md`), the process is: identify exact
reachability (is the vulnerable package actually in the production bundle,
or a devDependency-only tool?) before deciding whether to act — a blind
upgrade or downgrade is exactly what caused the false "fix" `npm audit fix
--force` would have applied for F-B (a major, unnecessary Prisma downgrade
that wouldn't even have removed the exposure).

**W24 re-check (Phase 4, 2026-08-18):** re-ran `npm audit --json` fresh.
Same 7 high advisories as the Phase 3 baseline, same two chains, still no
clean fix:

- `@huggingface/transformers@4.2.0` (latest published version — checked
  `npm view @huggingface/transformers versions`) still pulls
  `onnxruntime-node` → `adm-zip` (GHSA-xcpc-8h2w-3j85) and → `sharp`
  (GHSA-f88m-g3jw-g9cj). `npm audit`'s own `fixAvailable: false` for all
  three confirms no released version of the dependency chain resolves the
  range transformers depends on.
- `prisma@6.19.3` (devDependency, confirmed again by reading `package.json`
  directly) → `@prisma/config` → `deepmerge-ts` (GHSA-ggr8-5vv4-36mx).
  `npm audit`'s only offered `fixAvailable` is a downgrade to `prisma@6.12.0`
  flagged `isSemVerMajor: true` — i.e. not a fix, a regression, and the
  reachability analysis from F-B (devDependency-only, `@prisma/client` has
  zero deps, the vulnerable path needs a `prisma.config.ts` this repo
  doesn't have) is unchanged, so it's still not worth taking.

**Decision: no dependency change.** Dropping the local embedding provider
to silence the transformers advisories would change AI behavior for any
deployment without a hosted-provider API key configured — that's a product
decision, not a patch, and out of scope here. The standing recommendation
to the owner: set `EMBEDDING_PROVIDER=openai` or `voyage` in production
(neither pulls transformers/onnxruntime-node/sharp/adm-zip at all — the
import in `lib/ai/embeddings.ts` is dynamic and only executes when the
`local` provider is selected), and revisit dropping the local provider
entirely the next time the AI embedding path is deliberately touched. The
CI gate stays at `--audit-level=critical` — raise it to `high` only when
one of these two chains actually gets a fix, or the local provider is
removed. Re-check again at the next dependency-touching phase; do not leave
this indefinitely un-revisited.

---

## 7. What this runbook deliberately does not cover

**Incident-response process beyond emergency patching** — now covered by
`docs/20-incident-response.md` (Phase 4 / W23): detection/triage via
`SecurityEvent` queries and `x-request-id` correlation, revocation
playbooks for every existing mechanism, incident recording, and a customer
notification template (legal-obligation question left to the owner/legal
review).

**Formal backup procedures beyond the migration drill and manual
pre-migration snapshots** — now covered by `docs/21-backup-restore.md`
(Phase 4 / W25): a logical `pg_dump`/`pg_restore` procedure that doesn't
depend on Neon's own backup features, plus `scripts/restore-verify.ts`.
Neon's own PITR/backup-encryption/platform-restore capability stays
**UNVERIFIED**, stated explicitly — that confirmation is X2, owner-blocked.

Desktop/server compatibility — this is a hosted SaaS with no desktop
distribution. Neon environment separation *execution* (§1 — owner action,
not performed here).

# Backup and restore — Fatoora Lite Pro

Phase 4 / W25 (M-445…M-457). **Read §1 before anything else in this
document** — it draws the line between what this session could actually
verify and what stays blocked on the owner.

## 1. The split, stated up front

| | Status |
|---|---|
| Neon PITR enabled? (M-446) | **UNVERIFIED** — needs the Neon console (**X2**, owner-blocked) |
| Neon backup encryption? (M-447) | **UNVERIFIED** — needs the Neon console (**X2**) |
| Platform-level restore (Neon's own point-in-time restore feature) | **UNVERIFIED** — needs the Neon console (**X2**) |
| Logical backup (this document, §2) | **Delivered and works today** — `pg_dump` against the DIRECT `fatoora_audit`/`neondb` URL, no console access needed |
| Restore + verification (§3–4) | **Delivered**; the end-to-end drill was **not executed this session** — this machine has no `pg_dump`/`pg_restore` binaries installed (checked: neither is on `PATH`). The script and procedure are ready to run the moment those tools are available |

Nothing below should be read as confirming Neon's own backup/PITR
capability. That confirmation is **X2**, and only the owner (Neon console
access) can close it.

## 2. Logical backup procedure

**Never construct or print the actual connection string** — export it into
an environment variable and reference the variable name only, per
`docs/SESSION_HANDOFF_2026-08-18.md` §5's rule (already load-bearing this
programme: it's how Phase 3's DB-gated test runs were documented too).

**Always use the DIRECT (non-pooled) connection URL** — same reason as every
other schema-adjacent operation in this project (`docs/19-operations-runbook.md`
§3): pgbouncer's transaction-pooling mode doesn't reliably support the
session-level features a long-running dump can depend on.

```bash
# BACKUP_SOURCE_URL is the DIRECT url for whichever database you're backing
# up (fatoora_audit for a drill, or the shared neondb for a real pre-migration
# snapshot — see docs/19-operations-runbook.md §3's existing guidance on that).
pg_dump --format=custom --no-owner --no-privileges \
  --dbname="$BACKUP_SOURCE_URL" \
  --file="fatoora-backup-$(date +%Y%m%d-%H%M%S).dump"
```

- `--format=custom` produces a compressed, `pg_restore`-only archive — smaller
  than plain SQL, and restorable selectively (single table) if ever needed.
- `--no-owner --no-privileges` because the restore target's role names won't
  match the source's; re-granting ownership/privileges after restore is the
  app's own migration-applied schema's job, not the dump's.
- **Cadence recommendation**: before any risky migration (already covered by
  the runbook's existing "manual pre-migration snapshot" guidance) at
  minimum; a scheduled daily/weekly dump beyond that is a real operational
  addition the owner should decide to run somewhere (a cron'd job, a CI
  workflow, or a Neon-native scheduled export) — not built here, since it
  needs a place to actually run and be stored that this session doesn't
  have visibility into.
- **Dump storage/encryption**: the dump file contains full tenant data
  (invoice line items, VAT numbers, ZATCA-signed XML) — treat it exactly like
  the database itself. Store it encrypted at rest and never in a public or
  shared-access location. Where it's stored is an infrastructure decision
  for the owner, not fixed by this document.

## 3. Restore procedure

Restore into `fatoora_restore` — the database that already exists for
exactly this purpose (`START-HERE.md`'s "never do" list: never drop it, but
restoring *into* it is its entire reason for existing).

```bash
# RESTORE_TARGET_URL is fatoora_restore's DIRECT url.
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$RESTORE_TARGET_URL" \
  "fatoora-backup-<timestamp>.dump"
```

- `--clean --if-exists` drops existing objects (tables, constraints,
  indexes) inside `fatoora_restore` before recreating them from the dump —
  this is **object-level** cleanup, not `DROP DATABASE`. The project's
  never-drop constraint is about the database itself continuing to exist as
  a target; it says nothing about the objects inside it, which this
  procedure's entire job is to replace. Never run `DROP DATABASE
  fatoora_restore` as part of this or any other procedure.
- This lands `fatoora_restore` in exactly the state `fatoora_audit`/`neondb`
  was in when the dump was taken — including the current migration state
  (verified by §4's script, check 1).

## 4. Verification

`scripts/restore-verify.ts` (new this phase) runs four checks against the
restored database — migration currency, non-zero core-table row counts,
per-company sequence integrity (reusing `getSequenceIntegrity` from W22, so
a restore that lost the tail of the invoice table is caught the same way a
live sequence gap would be), and a PIH chain spot-check on each company's
most recent invoices.

```bash
export RESTORE_VERIFY_URL="<fatoora_restore DIRECT url>"
npx tsx scripts/restore-verify.ts
```

It hard-refuses to run against anything whose database name isn't exactly
`fatoora_restore` — no override flag — and never echoes the URL it's given.
Confirmed this session (dummy URL, no real database touched):

```
$ RESTORE_VERIFY_URL="postgres://user:pass@localhost:5432/some_other_db" npx tsx scripts/restore-verify.ts
Refusing: target database name is not exactly "fatoora_restore". This script only verifies the disposable restore-drill target.
```

**Not run end-to-end this session**: the actual dump → restore → verify
sequence, because this machine has neither `pg_dump` nor `pg_restore` on
`PATH`. This is recorded honestly rather than faked — see the ledger entry
for M-448/M-445. Run it the first time postgres client tools are available
locally (`winget install PostgreSQL.PostgreSQL` or equivalent), against
`fatoora_audit` → `fatoora_restore`, never against `neondb`.

## 5. Customer-facing export (M-454)

A tenant's own way to get their data out already exists and needs no new
work here: the audit vault (`searchInvoices`, invoice detail pages) plus
per-invoice XML/PDF download. **An expired trial keeps this access** — read-only,
not locked out, is the deliberate invariant (`START-HERE.md`) — so "can a
customer get their own data if they stop paying" is already answered yes.

## 6. Migration rollback and data compatibility (M-453, M-456, M-457)

Already covered, not duplicated here:

- `docs/19-operations-runbook.md` §3 — roll-forward-only convention, the
  DIRECT-vs-pooled URL rule, and `scripts/migration-drill.ts`, which already
  proves fresh-deploy correctness, idempotency, transactional-DDL
  failure/recovery, and a 5,000-invoice volume seed against `fatoora_audit`
  (run twice in Phase 3, 9/9 PASS both times).
- `docs/19-operations-runbook.md` §4 — the asymmetry between instant app-code
  rollback (`vercel rollback`) and database rollback (restore from a
  snapshot — the procedure this document defines).

---

## What is still genuinely blocked on the owner (X2)

Restated from §1 so it can't be missed: Neon's PITR enablement, backup
encryption, and platform-level restore capability are **not verified** by
anything in this document. This document only establishes a working
logical-backup path that doesn't depend on Neon's own backup features at
all — a deliberate hedge, not a substitute for confirming what Neon itself
provides.

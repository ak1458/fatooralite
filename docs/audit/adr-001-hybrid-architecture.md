# ADR-001 — Hybrid web SaaS architecture (Next.js on Vercel + Neon Postgres)

**Status:** Accepted (records a decision already embodied in the codebase; this
document changes no code or architecture).

**Decided:** 2026-08-19, per docs/audit/decision-register.md D5 — Option A
("write the evaluation"), owner-approved.

## Context

The 2026-08-18 production audit (Master Audit §32) asked for a written
evaluation of "hybrid vs standalone" architecture and specifically whether a
migration from Neon to Supabase should be made. No such document existed,
which left 16 ledger items (M-601…M-616) MISSING for a decision the codebase
already makes unambiguously in practice.

## Decision

Fatoora Lite Pro is, and remains, a **hybrid web SaaS**: a single Next.js 16
(App Router) application deployed to Vercel, backed by one Neon serverless
Postgres database (with the `pgvector` extension for the AI assistant's
retrieval layer), reached over HTTPS by any standard browser. There is no
desktop client, no per-customer deployment, and no plan to introduce either.

**No migration from Neon to Supabase.** The two are both managed Postgres
offerings with broadly comparable core capabilities for this application's
needs (connection pooling, branching/point-in-time recovery, a SQL
interface Prisma already targets identically). Nothing in the audit, the
remediation programme, or this application's own architecture surfaced a
capability Neon lacks that the product requires — the drivers named in
`decision-register.md` D6 (Postgres RLS) and the backup/restore questions in
D2/X2 are properties either database can support the same way. Migrating
would be pure churn: re-provisioning, a connection-string cutover in every
environment, and re-validating every migration and backup procedure this
programme already verified against Neon — for no capability gain.

## Why this holds up under the audit's own findings

The audit attacked tenant isolation 25 ways, licensing enforcement 12 ways,
and found both held — specifically *because* the server side is fully
controlled by this application:

- **Tenant isolation** is enforced in application code (every query scoped by
  `companyId`) against a database this deployment owns outright, not shared
  infrastructure with a third party's schema or access model layered on top.
- **Licensing/entitlement enforcement** (`lib/billing/entitlements.ts`) runs
  server-side, in the same process that serves every request — there is no
  client-distributable binary whose logic could be reverse-engineered or
  patched, the exact class of risk a desktop/standalone architecture would
  introduce.
- **Patching and central management** are a single Vercel deployment target
  and a single Neon database per environment — a security or compliance
  fix ships once, immediately, to every tenant, with no update-distribution
  problem to solve (see `START-HERE.md`'s M-098…M-123 items, all correctly
  N/A under this architecture).

A standalone/desktop architecture would trade all three of these for
problems this product does not have today: code-signing, per-machine update
delivery, local secret storage, and a much larger client-side attack
surface for licensing bypass. Nothing in the audit or the roadmap justifies
taking that on.

## Consequences

- Ledger items M-601…M-616 (Master Audit §32, "architecture evaluation") are
  satisfied by this document — the decision was already made in practice;
  this closes the paperwork gap, not an engineering one.
- This decision does not touch, resolve, or presuppose the answer to D6
  (Postgres RLS as defence in depth) — that is an orthogonal question about
  what runs *inside* the chosen database, not which database is chosen.
- No code changed. No architecture changed. If a future session wants to
  revisit this, it should open a new ADR rather than edit this one — this
  file is a record of what was decided and why, not a living design doc.

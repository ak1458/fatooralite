# Contributing to Fatoora Lite Pro

Fatoora Lite Pro is proprietary software (see [LICENSE](../LICENSE)). The source is
public for evaluation and portfolio purposes. External contributions are not
generally accepted, but bug reports and feedback are welcome via Issues.

If you have been granted access to contribute, follow this guide.

## Repository layout

```
README.md  LICENSE  CHANGELOG.md  CLAUDE.md  handoff.md
docs/                 numbered product docs (00-15), plans/, portal/ (generated)
archive/              historical material and local secrets — git-ignored
fatooralite/          the Next.js application
  app/                routes: (app) shell, /login, /onboarding, legal pages, /api/*
  components/         shell, ui, and per-module components
  lib/
    zatca/            pure signing/canonicalization/QR engine — no I/O
    db/               Prisma client, repositories, queries
    services/         orchestration across engine + repos (clearance, onboarding, auth)
    auth/             sessions, RBAC, requirePermission
    billing/          plan limits, Moyasar checkout and webhook
    ai/               provider abstraction, tool registry, RAG vector store
    validation/       shared zod schemas
    email/ ratelimit/ crypto/ i18n/ theme/ pdf/ constants/
  prisma/             schema, migrations, seed
  scripts/            validate-zatca, build-docs
  tests/e2e/          Playwright specs
```

`fatooralite/` is the Vercel **Root Directory**. Do not move or rename it without
also updating `vercel.json`, the CI workflow paths, and the Vercel project setting.

## Getting started

```bash
cd fatooralite
npm install
cp .env.example .env
docker compose up -d        # local Postgres + pgvector
npm run db:migrate && npm run db:seed
npm run dev
```

## Standards

- **TypeScript strict.** No `any` without cause.
- **Layered architecture:** pure engine (`lib/zatca`) → repositories (`lib/db`)
  → services (`lib/services`) → API (`app/api`) → UI. A layer may only import
  from layers below it.
- **Tenant scoping is not optional.** Every query against a tenant-owned model
  filters on `companyId`, and every route asserts the caller's tenant via
  `requirePermission` / `isCallerCompany`. Deny by default — never write a
  guard that short-circuits to allow on missing data.
- **Colors and fonts only via CSS variables**; user-facing text via the typed
  `Bilingual` shape (Arabic + English).
- **Tests first.** Add or extend Vitest unit tests; DB-touching tests use the
  injectable client and run when `TEST_DATABASE_URL` is set.

## Branching

| Branch           | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| `main`           | Always deployable. Protected. Tagged releases cut here.  |
| `release/x.y`    | Stabilisation for an upcoming minor, if one is needed.   |
| `feature/<slug>` | New functionality.                                       |
| `fix/<slug>`     | Bug fixes.                                               |
| `chore/<slug>`   | Tooling, deps, docs-only, CI.                            |
| `hotfix/<slug>`  | Cut from the release tag, merged to `main`, re-tagged.   |

Branches merge into `main` via PR. Delete the branch after merge. Agent worktree
branches (`worktree-*`) are scratch — never merge them; `git worktree prune` and
`git branch -D` them once the run is done.

## Commits

Conventional Commits, one logical change per commit:

```
<type>(<scope>): <imperative summary, lower case, no trailing period>

<body: what changed and, more importantly, why. Wrap at 76 columns.>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `db`,
`security`. Scope is the subsystem (`zatca`, `auth`, `billing`, `ai`,
`onboarding`, `repo`, `deps`).

**No tool or assistant attribution in commits.** Do not add `Co-Authored-By`
trailers, "Generated with" footers, or emoji sign-offs naming an AI tool. This
is enforced by the `commit-msg` hook in [`.githooks/`](../.githooks) — enable it
once per clone:

```bash
git config core.hooksPath .githooks
```

## Versioning and releases

[Semantic Versioning](https://semver.org/). `fatooralite/package.json` `version`
is the single source of truth and must match the tag.

- **MAJOR** — breaking change to the data model, the public API surface, or
  ZATCA document output.
- **MINOR** — new user-facing capability, backwards compatible.
- **PATCH** — bug fixes, security fixes, dependency bumps.

Pre-1.0 releases use `-rc.N` while the ZATCA gateway round-trip is still
unverified against production.

To cut a release:

1. Merge everything intended for the release into `main`.
2. Move the `CHANGELOG.md` `[Unreleased]` entries under a new
   `## [x.y.z] — YYYY-MM-DD · <theme>` heading.
3. Bump `fatooralite/package.json` to the same version.
4. `npm run lint && npm test && npm run zatca:validate && npm run build` — all green.
5. Commit `chore(release): vx.y.z`, then:

   ```bash
   git tag -a vx.y.z -m "vx.y.z — <theme>"
   git push origin main --follow-tags
   ```

6. Publish the GitHub Release against the tag, with the CHANGELOG section as
   the body and any migration or environment-variable steps called out.

**Milestones** track scope, not time: one GitHub milestone per planned MINOR
(`v0.5 — Licensing`, `v0.6 — Tenant provisioning`), with every issue assigned to
exactly one. A milestone closes when its release is tagged.

## Before opening a PR

```bash
cd fatooralite
npm run lint            # must be clean
npm test                # unit/engine/auth green
npm run zatca:validate  # signing + canonicalization checks
npm run build           # production build succeeds
```

Update [`handoff.md`](../handoff.md) in the same PR: what you finished, anything
the next session needs to know, and where to start next.

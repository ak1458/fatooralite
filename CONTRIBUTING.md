# Contributing to FatooraLite

FatooraLite is proprietary software (see [LICENSE](LICENSE)). The source is public
for evaluation and portfolio purposes. External contributions are not generally
accepted, but bug reports and feedback are welcome via Issues.

If you have been granted access to contribute, follow this guide.

## Project layout

The app lives in [`fatooralite/`](fatooralite/). Internal docs (specs, plans,
deploy guide, data-flow chart) live in `doc/` and are git-ignored.

```
fatooralite/
  app/        routes (app shell, modules, /login, /api/*)
  components/ shell, ui, per-module components
  lib/        zatca (engine), db (repos), services, auth, i18n, theme
  data/       typed mock data for the UI
  prisma/     schema, migrations, seed
  tests/e2e/  Playwright specs
```

## Getting started

```bash
cd fatooralite
npm install
cp .env.example .env
docker compose up -d        # local Postgres
npm run db:migrate && npm run db:seed
npm run dev
```

## Standards

- **TypeScript strict.** No `any` without cause.
- **Layered architecture:** pure engine (`lib/zatca`) → repositories (`lib/db`)
  → services (`lib/services`) → API (`app/api`) → UI.
- **Colors/fonts only via CSS variables**; user-facing text via the typed
  `Bilingual` shape (Arabic + English).
- **Tests first.** Add/extend Vitest unit tests; DB-touching tests use the
  injectable client and run when `TEST_DATABASE_URL` is set.

## Before opening a PR

```bash
npm run lint        # must be clean
npm test            # unit/engine/auth green
npm run build       # production build succeeds
```

Keep commits atomic and conventional (`feat:`, `fix:`, `docs:`, `test:`,
`chore:`). One logical change per commit.

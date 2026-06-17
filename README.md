# FatooraLite

ZATCA Phase 2 e-invoicing compliance platform for Saudi SMEs.

> "Become ZATCA Phase 2 compliant today." Compliance-first — not an ERP, not
> accounting software.

## Pass 1 — Foundation + UI

Bilingual (Arabic-RTL default / English), dark/light themed front-end for the six
core modules, driven by typed mock data. The Next.js app lives in `fatooralite/`.

Modules: **Compliance Command Center** (dashboard), **Invoice Operations**,
**ZATCA Integration Hub**, **Clearance Monitoring**, **Analytics**, **AI Assistant**.

## Run

```bash
cd fatooralite
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run test:e2e   # Playwright smoke
npm run lint
npm run build      # production build
```

## Tech

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 + CSS
variables · `next/font` · Vitest + Testing Library · Playwright.

## Architecture (intern-friendly)

- **One component = one purpose.** See `fatooralite/components/`.
- **Theming** via CSS custom properties switched by `data-theme` on `<html>`.
- **i18n** via a typed dictionary (`lib/i18n`) that flips `dir` + font stack.
- **Data** comes from a typed mock layer (`data/*.ts`) whose shapes mirror the
  future ZATCA/Prisma DTOs — later passes swap the data source with no component
  changes. See `doc/data-flow.md`.

## Roadmap

Pass 1 (this) → Compliance Engine → Company + ZATCA onboarding → Invoice creation
→ Clearance/Reporting → Audit Vault → Auth/Roles → v2 (notifications, live
analytics, AI backend, billing).

Internal docs, specs, design reference, and the data-flow chart live in `doc/`
(git-ignored, not deployed).

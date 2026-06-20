# FatooraLite

ZATCA Phase 2 e-invoicing compliance platform for Saudi SMEs.

> "Become ZATCA Phase 2 compliant today." Compliance-first — not an ERP, not
> accounting software.

The Next.js app lives in `fatooralite/`. Bilingual (Arabic-RTL default /
English), dark/light themed, **installable as a PWA**.

## What's built

- **UI** — six modules: Compliance Command Center, Invoice Operations, ZATCA
  Integration Hub (with onboarding), Clearance Monitoring, Analytics, AI
  Assistant + a New Invoice form and an Audit Vault.
- **Compliance engine** (`lib/zatca`) — UBL 2.1 XML, SHA-256 hash, secp256k1
  ECDSA stamp, TLV/base64 QR, PKCS#10 CSR, PIH chaining.
- **Real ZATCA gateway** (`lib/zatca/client`, `lib/zatca/onboarding`) — Compliance
  CSID → Production CSID onboarding, then real clearance (standard) / reporting
  (simplified) against the Fatoora sandbox or production gateway. No simulation.
- **Database** — Prisma + **PostgreSQL** (Supabase in prod; local via Docker).
- **Invoice issuing / clearance** — `POST /api/invoices`, `POST /api/invoices/:id/clear`.
- **Audit vault** — searchable signed-XML / QR / gateway-response archive.
- **Auth + RBAC** — scrypt passwords, role→permission matrix, jose session
  cookies, login, `proxy.ts` guard (opt-in via `AUTH_ENFORCE`).

## Run locally

```bash
cd fatooralite
npm install                 # also runs `prisma generate`
cp .env.example .env

docker compose up -d        # local Postgres (or point .env at Supabase)
npm run db:migrate          # apply migrations
npm run db:seed             # Almarai + users + sample data
npm run dev                 # http://localhost:3000

npm test                    # unit + engine + auth (DB tests skip w/o TEST_DATABASE_URL)
npm run test:e2e            # Playwright
npm run lint
npm run build
```

**Demo logins** (after seed): `khalid@almarai.example / owner1234` (owner),
`accountant@almarai.example / account1234`, `auditor@almarai.example / auditor1234`.

## ZATCA onboarding (required for real clearance)

Real clearance needs *your* certificate. Register the entity on the ZATCA Fatoora
portal, get the OTP, then in the app: **ZATCA Integration → Onboarding** →
"Request Compliance CSID" (CSR + OTP) → "Request Production CSID". After that,
issued invoices can be cleared/reported. Until then, signing works but the
gateway will reject (no valid CSID).

## Config (`.env`)

- `DATABASE_URL` / `DIRECT_URL` — Postgres (Supabase pooled + direct).
- `AUTH_SECRET` — session signing secret (required & validated in production).
- `AUTH_ENFORCE=true` — require login + RBAC on every page.
- `ZATCA_MODE=sandbox|production`, `ZATCA_SANDBOX_BASE_URL`, `ZATCA_PRODUCTION_BASE_URL`.

## Deploy (free tier)

**Supabase (DB) + Vercel (host).** See `doc/DEPLOY.md`. Summary: create a Supabase
project → set `DATABASE_URL`/`DIRECT_URL`; import the repo on Vercel with **Root
Directory = `fatooralite`**, add env vars, deploy; run `npm run db:migrate` against
Supabase once.

## Tech

Next.js 16 · React 19 · TypeScript (strict) · Tailwind v4 · Prisma 6 · jose ·
node-forge · xmlbuilder2 · Vitest · Playwright. PWA via `app/manifest.ts` + `public/sw.js`.

## Architecture (intern-friendly)

- **Layers:** pure engine (`lib/zatca`, no I/O) → repositories (`lib/db`) →
  services (`lib/services`) → API routes (`app/api`) → UI (`app/(app)`).
- Colors/fonts only via CSS variables; text via the typed `Bilingual` shape.
- Engine + auth are pure and unit-tested; repositories take an injectable client.

Internal docs (specs, plans, data-flow chart, deploy guide, project report,
design reference, screenshots) live in `doc/` (git-ignored, not deployed).

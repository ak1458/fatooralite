# FatooraLite

ZATCA Phase 2 e-invoicing compliance platform for Saudi SMEs.

> "Become ZATCA Phase 2 compliant today." Compliance-first — not an ERP, not
> accounting software.

The Next.js app lives in `fatooralite/`. Bilingual (Arabic-RTL default /
English), dark/light themed.

## What's built

- **UI** — six modules: Compliance Command Center (dashboard), Invoice
  Operations, ZATCA Integration Hub, Clearance Monitoring, Analytics, AI
  Assistant + a New Invoice form and an Audit Vault.
- **Compliance engine** (`lib/zatca`) — UBL 2.1 XML, SHA-256 invoice hash,
  secp256k1 ECDSA cryptographic stamp, TLV/base64 QR, PKCS#10 CSR, PIH chaining.
- **Database** (`prisma/`, `lib/db`) — Prisma + SQLite (Postgres-ready): Company,
  Branch, Certificate, Invoice (+lines), ClearanceRecord, AuditEntry, User.
- **Invoice issuing** — `POST /api/invoices` creates → signs → chains → stores.
- **Clearance / reporting** — ZATCA client with `simulation` (offline, default),
  `sandbox`, and `production` modes; BR-KSA validation; `POST /api/invoices/:id/clear`.
- **Audit vault** — searchable signed-XML / QR / gateway-response archive.
- **Auth + RBAC** — scrypt passwords, role→permission matrix, jose session
  cookies, login page, `proxy.ts` route guard (opt-in via `AUTH_ENFORCE`).

## Run

```bash
cd fatooralite
npm install
cp .env.example .env        # SQLite + AUTH_SECRET defaults work out of the box
npm run db:migrate          # create the SQLite schema
npm run db:seed             # seed Almarai + users + sample invoices
npm run dev                 # http://localhost:3000

npm test                    # unit + integration (Vitest)
npm run test:e2e            # Playwright (smoke + auth)
npm run lint
npm run build               # production build
```

**Demo logins** (after seed): `khalid@almarai.example / owner1234` (owner),
`accountant@almarai.example / account1234`, `auditor@almarai.example / auditor1234`.

### Config flags (`.env`)

- `AUTH_ENFORCE=true` — require login + RBAC on every page (off by default so the
  demo runs open).
- `ZATCA_MODE=simulation|sandbox|production` — clearance backend. `simulation`
  needs no credentials; `sandbox`/`production` require a real CSID.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 + CSS
variables · Prisma 6 · jose · node-forge · xmlbuilder2 · Vitest + Testing
Library · Playwright.

## Architecture (intern-friendly)

- **One component / module = one purpose.**
- **Theming** via CSS custom properties switched by `data-theme` on `<html>`.
- **i18n** via a typed dictionary (`lib/i18n`) that flips `dir` + font stack.
- **Engine is pure** (`lib/zatca`) — no I/O, fully unit-tested.
- **Services** (`lib/services`) orchestrate engine + DB; **repositories**
  (`lib/db`) wrap Prisma with an injectable client for testing.
- **UI data** still uses the typed mock layer (`data/*.ts`) shaped like the DB
  DTOs; see `doc/data-flow.md`.

## Roadmap status

Done: UI · Compliance Engine · Data model · Invoice creation · Clearance/Reporting
· Audit Vault · Auth/RBAC.
Next (v2): real CSID onboarding flow, live dashboard data, AI backend,
notifications, billing.

Internal docs, specs, design reference, and the data-flow chart live in `doc/`
(git-ignored, not deployed).

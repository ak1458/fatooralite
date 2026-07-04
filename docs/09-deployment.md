# FatooraLite — Deployment Guide

**Audience:** anyone deploying FatooraLite to production, start to finish. No prior
knowledge of the codebase assumed. Follow the steps in order; each has a verification.

The reference stack is **Vercel (app) + Neon (Postgres with pgvector)**. Any Node 20+
host and any Postgres 15+ with the `vector` extension works the same way — only the
platform-specific steps differ.

---

## 0. What you are deploying

- A **Next.js 16** application (`fatooralite/`) — UI + API routes in one deployable.
- A **PostgreSQL** database (Prisma-managed schema, migrations in
  `fatooralite/prisma/migrations/`), with the **pgvector** extension for AI retrieval.
- Optional **AI provider** (OpenRouter / Anthropic / OpenAI) — the app runs without a
  key (AI features enter mock mode), but production should have one.

No other services are required. Local embeddings (default) run in-process.

---

## 1. Prerequisites

| Requirement | Why |
|---|---|
| Node.js 20+ and npm | build and run the app |
| A Postgres 15+ database with `vector` extension available | Neon has it built in; for self-hosted use the `pgvector/pgvector` image |
| Git access to this repository | deploy source |
| (Optional) OpenRouter / Anthropic / OpenAI API key | live AI assistant |
| (Production ZATCA) Fatoora portal account + OTP | real CSID onboarding |

---

## 2. Create the database (Neon)

1. Create a project at <https://neon.tech> (region close to your users; for Gulf
   deployments choose the nearest available region).
2. From the project dashboard copy **two** connection strings:
   - the **pooled** connection string (host contains `-pooler`) → `DATABASE_URL`
   - the **direct** connection string (no `-pooler`) → `DIRECT_URL`
3. Both must end with `?sslmode=require`.

> pgvector: the migration runs `CREATE EXTENSION IF NOT EXISTS "vector"` — Neon
> allows this without any manual step. On self-hosted Postgres make sure the
> extension is installed (use the `pgvector/pgvector:pg16` image, as in
> `fatooralite/docker-compose.yml`).

**Verify:** `psql "<DIRECT_URL>" -c "select 1"` connects.

---

## 3. Generate secrets

```bash
# Session-signing secret (JWT HS256)
openssl rand -base64 48     # -> AUTH_SECRET

# At-rest encryption key for ZATCA private keys (32 bytes, base64)
openssl rand -base64 32     # -> ENCRYPTION_KEY
```

Store these in a password manager. **Rotating `ENCRYPTION_KEY` invalidates stored
certificate private keys** (companies must re-onboard), so treat it as durable.

---

## 4. Environment variables

Set these on the platform (Vercel → Project → Settings → Environment Variables).
Never commit them.

### Required

| Variable | Value |
|---|---|
| `DATABASE_URL` | pooled Neon URL |
| `DIRECT_URL` | direct Neon URL (used by migrations) |
| `AUTH_SECRET` | from step 3 |
| `AUTH_ENFORCE` | `true` — **mandatory in production** (login + RBAC enforced) |
| `ENCRYPTION_KEY` | from step 3 |
| `APP_URL` | your canonical URL, e.g. `https://app.example.com` |

### ZATCA

| Variable | Value |
|---|---|
| `ZATCA_MODE` | `sandbox` \| `simulation` \| `production` |

Start with `sandbox`. Switch to `production` only after real onboarding succeeds there.

### AI (choose ONE provider)

| Variable | Value |
|---|---|
| `AI_PROVIDER` | `openrouter` (default) \| `anthropic` \| `openai` |
| `OPENROUTER_API_KEY` | when provider is openrouter |
| `ANTHROPIC_API_KEY` | when provider is anthropic |
| `OPENAI_API_KEY` | when provider is openai |
| `AI_MODEL` | optional model override (e.g. `claude-opus-4-8`, `gpt-4o-mini`) |
| `AI_FALLBACK_MODEL` | optional (OpenRouter only — routed fallback) |

### Embeddings (RAG)

| Variable | Value |
|---|---|
| `EMBEDDING_PROVIDER` | `local` (default, no key) \| `openai` \| `voyage` |
| `OPENAI_EMBEDDING_MODEL` / `VOYAGE_EMBEDDING_MODEL` | optional overrides |
| `VOYAGE_API_KEY` | when provider is voyage |

> `local` downloads the MiniLM model (~90 MB) on first use. On serverless this
> means a cold-start delay on the first AI request per instance; hosted embeddings
> (`openai`/`voyage`) avoid it. **After switching embedding providers, re-ingest**
> (step 8) — vectors from different models are not comparable.

### Optional

| Variable | Value |
|---|---|
| `SEED_DEMO` | leave **unset** in production (demo seed is opt-in for local dev only) |

---

## 5. Run migrations

Migrations run against `DIRECT_URL`. From your machine (or a CI step):

```bash
cd fatooralite
npm ci
# put DATABASE_URL + DIRECT_URL in the environment for this command
npx prisma migrate deploy
```

**Verify:** `npx prisma migrate status` prints "Database schema is up to date".

---

## 6. Deploy the app (Vercel)

1. Import the Git repository in Vercel. Set **Root Directory = `fatooralite`**.
2. Framework preset: Next.js (defaults are fine — `npm run build`).
3. Add all environment variables from step 4 (Production scope).
4. Deploy.

Self-hosted equivalent:

```bash
cd fatooralite
npm ci
npm run build
npm run start        # serves on :3000 — put a TLS-terminating proxy in front
```

**Verify:** open the deployment URL → the login page renders. `GET /api/companies`
without a session returns 401 (proves `AUTH_ENFORCE` is active).

---

## 7. First-run bootstrap

1. Open the app → **Register**: creates your user (owner) + company (VAT number).
2. Complete the **onboarding wizard**:
   - **Local certificate** (default): instant self-managed signing key — the app can
     issue/sign/QR/PDF immediately; gateway clearance stays disabled until real
     onboarding.
   - **Connect ZATCA** (production path): enter the OTP from the
     [Fatoora portal](https://fatoora.zatca.gov.sa) → the app requests a compliance
     CSID, runs the four mandatory compliance checks (standard, simplified, credit,
     debit samples), then obtains the production CSID.
3. Add a customer and a product; issue a test invoice; download its PDF.

**Verify:** the invoice appears under Invoices with status `signed`, and its detail
page (`/invoices/<id>`) shows hash + QR + XML.

---

## 8. Build the AI knowledge base

Once logged in as the owner:

```
POST /api/ai/ingest              # global ZATCA regulation corpus
POST /api/ai/ingest {"scope":"company"}   # your tenant's own data summaries
```

(Both are also triggered from the app; tenant data re-ingests automatically after
invoice/customer/product changes, debounced.)

**Verify:** `GET /api/ai/ingest` returns non-zero `totalGlobal`; asking the
assistant a ZATCA question returns a grounded, cited answer.

---

## 9. Production hardening checklist

- [ ] `AUTH_ENFORCE=true` and a strong, unique `AUTH_SECRET`
- [ ] `ENCRYPTION_KEY` set (certificate private keys encrypted at rest)
- [ ] `SEED_DEMO` unset
- [ ] HTTPS enforced end-to-end (Vercel does this; self-hosted needs a proxy)
- [ ] Neon: enable branch protection / PITR backups
- [ ] Vercel: enable "Protect Preview Deployments" so previews aren't public
- [ ] Set `ZATCA_MODE=production` only after sandbox onboarding passes
- [ ] Confirm no secrets in the repo: `git grep -iE "sk-or-|sk-ant-|postgres://" -- ':!*.md'` returns nothing
- [ ] Rate limits: `fatooralite/proxy.ts` applies per-IP limits — tune for your traffic

---

## 10. Upgrades

```bash
git pull
cd fatooralite && npm ci
npx prisma migrate deploy   # applies any new migrations
# redeploy (Vercel does this automatically on push)
```

Schema changes always ship as migrations — never run `prisma db push` against
production.

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Environment validation failed` at boot | missing `DATABASE_URL`/`AUTH_SECRET` — check step 4 |
| First AI request very slow | local embedding model cold start — use `EMBEDDING_PROVIDER=openai`/`voyage`, or accept the one-time delay per instance |
| AI answers "mock mode" | no provider key set for the selected `AI_PROVIDER` |
| ZATCA submit fails with 401 from gateway | company still on the local dev certificate — run real onboarding (step 7.2) |
| `relation "KnowledgeChunk" ... vector` errors | migrations not applied to this database — step 5 |
| Retrieval returns nothing after switching `EMBEDDING_PROVIDER` | re-ingest both scopes (step 8) |

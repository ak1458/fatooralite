# FatooraLite — Architecture

**Status:** For approval · Pairs with [PRD](./01-prd.md)

---

## 1. Stack (current + planned)

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), React 19, TypeScript | Middleware is `proxy.ts` (renamed in 16). Route handlers stream via web `ReadableStream` (every `pull` must enqueue-or-close). |
| DB | **Neon Postgres** (free tier) + **Prisma** | Pooled URL for runtime, direct URL for migrations. |
| Vector store | **Neon `pgvector`** (default) behind a `VectorStore` interface | Swappable: Upstash Vector / Qdrant. Reuses existing DB. |
| Auth | Custom sessions with **jose** (JWT), cookie `SESSION_COOKIE` | Add signup, RBAC, enforced mode. |
| AI (generation) | **OpenRouter** (OpenAI-compatible), free models `openai/gpt-oss-120b:free` (+ `:20b` fallback) | `reasoning: effort low`; mock mode when no key. |
| AI (embeddings) | Free embedding provider (configurable), default Google `text-embedding-004` | Stored as `vector` in pgvector. |
| ZATCA crypto | `lib/zatca/*` (node-forge, xmlbuilder2) | Keypair, CSR, ECDSA-SHA256, XAdES, C14N, PIH, TLV QR — already real. |
| PDF | `pdf-lib` + `qrcode` | Tax invoice with embedded QR + XML attachment. |
| Styling | Inline styles + CSS custom properties + `globals.css` | Theme via `data-theme`; RTL via `dir`. Animation layer to be standardized. |
| Validation | **zod** (`lib/validation/schemas.ts`) | Applied to every mutating route. |
| Tests | Vitest + Testing Library; Playwright (e2e) | TDD for services/routes. |

## 2. High-level structure

```
Browser (PWA)
  └─ Next.js App Router
       ├─ proxy.ts ............ rate limit, CSRF, auth gate (AUTH_ENFORCE)
       ├─ app/(auth) .......... /login, /register
       ├─ app/(onboarding) .... /onboarding wizard (first-run)
       ├─ app/(app) ........... authenticated modules (dashboard, invoices, ...)
       │     └─ <AssistantDock/> mounted in layout → AI on every page
       └─ app/api/* ........... route handlers (REST-ish, JSON)
             ├─ auth/*  companies/*  branches/*  users/*  roles/*
             ├─ invoices/*  notes/*  customers/*  products/*
             ├─ clearance/*  audit/*  analytics/*  reports/*  notifications/*
             └─ ai/{chat,agent,insights,ingest}
Services (lib/services/*) ...... issueInvoice, submitInvoice (clearance), onboarding
Domain (lib/zatca/*) ........... crypto + XML + QR (pure, tested)
Repo (lib/db/*) ................ Prisma access, tenant-scoped
External ....................... ZATCA gateway, OpenRouter, embedding API
```

## 3. Data model (target)

Existing: `Company, Branch, Certificate, Invoice, InvoiceLine, ClearanceRecord,
AuditEntry, User, Customer, Product, Notification`.

**Add / change:**
- `Company.onboardingStatus` (`pending|in_progress|complete`) + `onboardingStep`.
- `Branch` becomes the real "location" used by the active-branch selector (already exists; wire it).
- `Role` (id, companyId, name, isSystem) + `RolePermission` (role → permission string); `User.roleId` (in addition to/replacing the free-text `role`). Keep `User.title` (designation).
- `User.status` (`active|invited|disabled`), `User.invitedAt`.
- `KnowledgeChunk` (id, scope `global|company`, companyId?, source, text, `embedding vector`) for RAG.
- `Setting` (companyId, key, value json) for tenant settings, or typed columns on `Company`.
- `Notification` already present; ensure a generator writes real events.

All tenant tables carry `companyId`; **every query is filtered by the caller's company** (enforced in repo + route).

## 4. AI architecture

### 4.1 Chatbot (RAG)
1. **Ingestion**: ZATCA regulation text (curated) + tenant data summaries (invoices, rejections, customers) are chunked, embedded, and stored in `KnowledgeChunk` (scope `global` for regs, `company` for tenant data).
2. **Query**: user message → embed → `pgvector` similarity search (top-k, filtered by `scope in (global, this company)`) → build context → OpenRouter chat (streaming) grounded on retrieved chunks → cite sources.
3. **Model selection**: UI lets the user pick among configured free models; default gpt-oss-120b.

### 4.2 Agentic actions (structured-intent registry)
- System prompt instructs the model to reply with prose **or** a JSON block `{ "action": string, "params": {...} }`.
- `/api/ai/agent` parses the block, looks up the action in a **server-side registry**:
  ```
  ActionDef = { name, description, zodSchema, requiredPermission, handler }
  ```
- Server validates `params` with zod, checks RBAC, executes a **real** service/repo call, returns a structured result. Unknown/disallowed → safe refusal. No arbitrary code path.
- Client applies the result (navigate, refresh data, toast). Example: `"make a 7-day report"` →
  `{action:"generateReport",params:{rangeDays:7}}` → handler aggregates → client routes to `/reports`.
- The same registry powers per-tab assistants (the dock passes the current route as context to bias suggested actions).

### 4.3 Why structured-intent (not raw tool-calling)
Free models' native function-calling is unreliable; structured-intent works on any model,
is trivially auditable, and keeps execution behind zod + RBAC. Native tool-calling can be
layered in later without changing the registry.

## 5. Security

- Secrets only in `.env` (gitignored) / platform env vars / local `archive/` (gitignored). Never committed, never shipped to the client bundle. ZATCA private keys encrypted at rest (`lib/crypto/encrypt.ts`).
- `proxy.ts`: per-IP rate limit, CSRF origin check on mutations, auth redirect when `AUTH_ENFORCE=true` (default-on in production).
- Every API route: authenticate → authorize (permission) → tenant-scope. No `companyId` is trusted from the client without ownership check.
- Passwords hashed (`lib/auth/password.ts`). Sessions are signed JWTs with expiry.

## 6. Theming & animation (to standardize)

- **Theme**: single source via `data-theme` on `<html>`; all colors from CSS vars in `globals.css`; `ThemeProvider` toggles + persists; anti-flash inline script already present. Fix: audit every component for hardcoded colors; ensure light mode parity; `<body>` needs `suppressHydrationWarning` (browser extensions inject attributes).
- **Animation**: **Framer Motion** (decision locked) layered on shared motion tokens (durations, easing) in CSS vars. Reusable transitions for page/route, list enter, modal/slide-over, toast. Respect `prefers-reduced-motion`.

## 7. Deployment

- Target: Vercel (or Node host) + Neon. Env vars set on the platform (never the `archive/` files).
- `AUTH_ENFORCE=true`, real `ZATCA_MODE`, `OPENROUTER_API_KEY`, embedding key, `DATABASE_URL/DIRECT_URL`.
- Migrations via `prisma migrate deploy` against `DIRECT_URL`. pgvector extension enabled on Neon.
- No seed in production; optional dev seed behind `SEED_DEMO=true`.

## 8. Module boundaries (for testability)

Each module = page(s) + API route(s) + a service/repo function with one clear job. UI never
talks to Prisma directly; it calls API routes; routes call services/repo; services call the
domain (`lib/zatca`). This keeps units small and independently testable.

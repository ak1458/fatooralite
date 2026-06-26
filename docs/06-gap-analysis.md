# FatooraLite — Current-State Gap Analysis

Honest assessment of what is real, what is mock/broken, and exactly where. Grounded in the
codebase, not assumptions. This is the punch-list the roadmap works through.

Legend: ✅ real & working · 🟡 partial/real-but-buggy · 🔴 mock/stub/broken · ⛔ missing.

---

## What is genuinely real today
- ✅ **ZATCA crypto engine** (`lib/zatca/*`): keypair, CSR, ECDSA-SHA256, XAdES, C14N, PIH, TLV QR — tested.
- ✅ **DB**: Neon Postgres + Prisma; tenant tables exist.
- ✅ **AI generation**: OpenRouter chat streaming + insights endpoint (real, grounded in invoice data).
- ✅ **PDF**: tax invoice with embedded QR + XML attachment.
- ✅ **Auth primitives**: hashed passwords, JWT sessions, `requirePermission`, `proxy.ts` (rate limit + CSRF + auth gate).
- ✅ Some real list endpoints: reports (month + CSV), notifications API, products/customers/invoices APIs exist.

## Mock / broken inventory (the complaints, located)

| Area | State | Root cause (file) | Fix |
|---|---|---|---|
| Sidebar badge "12 invoices" | 🔴 | hardcoded `badge:"12"` in `data/nav.ts` | compute from real counts or remove |
| Notifications badge "4" | 🔴 | hardcoded `badge:"4"` in `data/nav.ts` | bind to real unread count |
| Pre-seeded company "Almarai", user "Khalid", branch "Riyadh HQ" | 🔴 | `prisma/seed.ts` | remove from prod; self-register instead; dev-only seed behind flag |
| Profile menu → goes to sign-in | 🟡 | profile menu not wired | real menu (profile, settings, logout) |
| Dashboard "Loading KPIs…" forever | 🟡 | shape mismatch: page reads `data.kpis.kpis`, `/api/dashboard` returns flat | align response shape (Functional Spec §3) |
| Dashboard health/integration/trust tiles | 🔴 | `HealthRing/IntegrationStatus/TrustBadges` use `@/data/*` | bind to real dashboard API |
| Invoices "Loading invoices…" forever | 🟡 | fetch never resolves to data/empty/error state | fix fetch + states |
| Create Notes does nothing | 🔴 | `NewNoteForm` not wired to an API | `POST /api/notes` + pipeline |
| Customers infinite loading | 🟡 | list fetch/state handling | fix + empty/error states |
| Products "Loading Products…" forever | 🟡 | same | fix + states |
| Debit notes empty | 🔴 | no data/flow | build notes flow |
| Branch/location dropdown does nothing | 🔴 | `useCompany` only tracks company, not branch; selector not wired | active-branch context + persistence + re-scoping |
| ZATCA Integration tiles (Production/Latency/ERP/Compliance Engine/Create Test) | 🔴 | `CertificateWidget` + static `@/data` | real CSID lifecycle + explained controls |
| Compliance Center 99.2% / 3 / 14 / 87 | 🔴 | `ClearanceStats/Feed/SuccessDonut` use `@/data/clearance` | real aggregates from `Invoice`+`ClearanceRecord`; add `/api/clearance` |
| Analytics numbers | 🟡 | real endpoint exists but has dummy fallbacks | remove dummies; real empty states |
| AI Assistant: no chatbot/model/AI | 🟡 | chat works at `/ai` but no model selection, no RAG, not embedded everywhere | RAG + vector DB + model selector + global dock |
| Notifications panel empty / bell dead | 🔴 | bell not wired; generator not run | working bell panel; event generator |
| Users & Roles | 🔴/⛔ | `users/page.tsx` = `StubScreen`; no `/api/users`, no roles | full module |
| Settings | 🔴 | minimal placeholders | comprehensive sectioned settings |
| Sign up | ⛔ | only `/login`; no register page/API | build register flow |
| Onboarding-first | ⛔ | app opens on dashboard of seeded tenant | onboarding wizard + guard |
| Vector DB / RAG | ⛔ | none | pgvector + ingestion + retrieval |
| Theme consistency | 🟡 | works but inconsistent; `<body>` missing `suppressHydrationWarning` | audit + fix; add attribute |
| Animations | 🟡 | ad-hoc | motion tokens + standardized transitions |

## `liveIds` reality
`data/nav.ts` declares only `dashboard, invoices, integration, clearance, analytics, ai` as
"fully built" — everything else renders a stub or partially-wired screen. The target is for
**all** modules to be live, so `liveIds`/stub gating is retired.

## The hydration error (reported console error)
Not an app bug per se: a browser extension (Grammarly) injects `data-gr-ext-installed` /
`data-new-gr-c-s-check-loaded` onto `<body>`. `<html>` already has `suppressHydrationWarning`;
`<body>` does not. **Fix:** add `suppressHydrationWarning` to `<body>` in `app/layout.tsx`.

## Net assessment
The **foundation is strong** (real crypto, DB, signing, PDF, streaming AI). The product is
"a real engine inside a mostly-mock UI." Closing the gap is mostly **wiring real data +
building the missing modules (auth/onboarding/users/roles/settings/RAG)** and **polish**,
not rebuilding the hard cryptographic core.

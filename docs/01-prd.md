# FatooraLite — Product Requirements Document (PRD)

**Version:** 1.0 (foundational) · **Owner:** Product · **Status:** For approval

---

## 1. Vision

FatooraLite is the simplest way for a Saudi SME to be **ZATCA Phase 2 compliant**. A
business should be able to sign up, connect to ZATCA in minutes, and issue legally valid
e-invoices forever after — with the cryptography, clearance, reporting, and audit trail
handled for them. The long-term goal is a **commercial multi-tenant SaaS** product.

## 2. Goals & Non-Goals

### Goals
- G1. Self-serve **company registration** and guided **ZATCA onboarding** (no pre-seeded tenants).
- G2. **Real, working** invoicing: standard + simplified, credit/debit notes, all signed and submitted.
- G3. A **Compliance Center** that reflects true clearance/reporting state from live data.
- G4. **Multi-tenant** isolation with **RBAC**: users, roles, permissions, branches.
- G5. An **AI Assistant** that (a) answers ZATCA questions via real retrieval (RAG over a vector DB) and (b) performs real in-app actions via a safe action registry.
- G6. **Production quality**: no mock data, validated inputs, consistent loading/empty/error states, polished theming and animation, secure secrets.

### Non-Goals (v1)
- NG1. Full accounting / general ledger (we are invoicing + compliance, not an ERP).
- NG2. Payments / payment gateway integration.
- NG3. Native mobile apps (PWA only).
- NG4. Languages beyond Arabic + English.
- NG5. ZATCA phases beyond Phase 2 Integration.

## 3. Domain context (ZATCA Phase 2 "Fatoora")

Authoritative rules the product must honor:

- **Invoice types**
  - *Standard (B2B/B2G, type 0100000)* → must be **cleared** by ZATCA **before** sharing with the buyer. Requires full buyer identity (name, address, VAT number).
  - *Simplified (B2C, type 0200000)* → must be **reported** to ZATCA **within 24 hours** of issuance. Buyer details optional.
- **Documents**: invoice, credit note, debit note (notes reference the original invoice + reason).
- **VAT categories**: S (standard 15%), Z (zero-rated), E (exempt, needs reason+code), O (out of scope).
- **Cryptography**: ECDSA-SHA256 (secp256k1), XAdES-EPES enveloped signature, C14N exclusive canonicalization.
- **Hash chain (PIH)**: each invoice carries the Previous Invoice Hash; the first uses a genesis base64 hash. **ICV** (Invoice Counter Value) increments sequentially.
- **QR**: TLV (tag-length-value), base64; tags 1–5 (Phase 1) + 6–9 (Phase 2: hash, signature, public key, stamp).
- **Onboarding (CSID)**: generate keypair + CSR → request **Compliance CSID** → run compliance checks (sample invoices) → request **Production CSID** → use it to clear/report.
- **Environments**: ZATCA **sandbox/simulation** vs **production** gateways.

> The cryptographic engine for the above already exists in `lib/zatca/*` and is exercised by tests. The product work is the surrounding application, not re-inventing the crypto.

## 4. Personas & permissions

| Persona | Needs | Default role |
|---|---|---|
| Owner | Everything; billing; manage the ZATCA connection | `owner` |
| Admin | Manage users/roles/branches/settings | `admin` |
| Accountant | Create/issue invoices, notes, customers, products; file reports | `accountant` |
| Auditor | Read-only access to invoices, audit vault, compliance | `auditor` |
| Viewer | Read-only dashboards | `viewer` |

RBAC is **permission-based** (roles map to permission sets). Admins can create **custom roles**
by composing permissions. See §8.4.

## 5. Scope — modules (v1)

1. **Auth** — login, sign up, logout, session, password reset (basic).
2. **Onboarding wizard** — company → ZATCA connection → branches → finish. *Primary first-run experience.*
3. **Dashboard** — real KPIs, health, live feed, volume (the "secondary" screen, post-onboarding).
4. **Invoices** — list, create (standard/simplified), view, PDF, sign + submit.
5. **Credit / Debit Notes** — create against an existing invoice with reason.
6. **Customers** — CRUD, used as invoice buyers.
7. **Products** — CRUD, used as invoice line items (price, VAT category, unit).
8. **ZATCA Integration** — CSID lifecycle, environment, connection health (see Feature Docs §ZATCA Integration).
9. **Compliance Center** — real clearance/reporting monitor, rejections, deadlines, PIH integrity.
10. **Audit Vault** — immutable record of every artifact sent to/from ZATCA.
11. **Analytics** — real revenue/VAT/clearance metrics.
12. **Reports** — VAT return summary, exports (CSV), date-range reports.
13. **AI Assistant** — RAG chatbot + agentic actions + model selection.
14. **Notifications** — real, generated from compliance events; working bell + center.
15. **Users & Roles** — user CRUD, role/permission management, designations.
16. **Settings** — company, branches, ZATCA, users, AI, appearance, billing, security.

## 6. Functional requirements (high level; details in 04-functional-spec)

- FR1. A new visitor can **register a company** and become its owner. No tenant exists until someone creates it.
- FR2. First login with no completed onboarding routes to the **Onboarding wizard**, not the dashboard.
- FR3. Every list view (invoices, customers, products, notes, users, notifications) loads from the tenant's real data and shows **loading → data | empty | error** states. No infinite spinners. No hardcoded counts/badges.
- FR4. Creating an invoice/note runs the real `issueInvoice` pipeline (totals → XML → sign → store), then optionally submits to ZATCA per type.
- FR5. The **branch/location selector** actually switches the active branch and scopes data.
- FR6. The **AI Assistant** retrieves from a vector store of ZATCA regulations + tenant data and can execute registered actions; it streams responses and supports model selection.
- FR7. Notifications reflect real events; the **bell opens a working panel**; badge counts equal unread count.
- FR8. RBAC is enforced on every API route and reflected in the UI (hidden/disabled actions).
- FR9. Theme (dark/light) and language (en/ar, RTL) are consistent across **every** screen with no flash or mismatch.

## 7. Non-functional requirements

- NFR1. **Security**: secrets never in git/live bundles; private keys encrypted at rest; tenant isolation on every query; auth enforced by default in production; CSRF + rate limiting (already in `proxy.ts`).
- NFR2. **Performance**: dashboard/list TTFB reasonable; AI first-token < ~6s on free models; no N+1 on hot paths.
- NFR3. **Reliability**: graceful degradation when ZATCA/AI unavailable (queued/mock-safe, clearly labeled).
- NFR4. **Accessibility**: keyboard navigable, focus states, ARIA on interactive controls, RTL correctness.
- NFR5. **Quality**: unit + integration tests for services and routes; e2e for critical flows (signup → invoice → clearance).
- NFR6. **Observability**: audit log of all ZATCA interactions; error logging.

## 8. Key product decisions (locked unless you object)

- 8.1 **Onboarding-first**: the dashboard is secondary; new tenants must complete onboarding.
- 8.2 **No seed tenants in production**. A dev-only seed may exist behind a flag for local testing.
- 8.3 **AI agency = structured-intent action registry** (model-agnostic, safe) with optional native tool-calling later.
- 8.4 **RBAC = permissions + composable roles**; ship 5 system roles + custom roles.
- 8.5 **Vector DB**: default to **Neon `pgvector`** (reuse existing Postgres, free, no new vendor); abstract behind an interface so Upstash Vector/Qdrant can swap in. Embeddings via a free provider (configurable).
- 8.6 **Multi-tenant model**: `Company` = tenant; `Branch` = location; users belong to a company.

## 9. Success metrics

- Activation: % of signups that complete onboarding (target ≥ 70%).
- Time-to-first-cleared-invoice (target < 30 min from signup in sandbox).
- Compliance: % invoices cleared/reported without manual fix (target ≥ 98%).
- AI usefulness: % assistant sessions that resolve without escalation.
- Reliability: invoice submission success rate; zero secret leaks.

## 10. Monetization (direction, not v1 billing build)

Per-company subscription, tiered by monthly invoice volume, branches, and seats. Free
sandbox tier for evaluation. Add-ons: API access, extended archival, premium support.
(Billing implementation is post-v1; Settings reserves a Billing section.)

## 11. Resolved decisions (locked)

- OQ1 → **Embeddings: Google `text-embedding-004`** (free tier), stored in Neon `pgvector`.
- OQ2 → **Animation: Framer Motion** (premium polish is a stated priority; ~50KB acceptable).
- OQ3 → **Sign-up: open public registration** (anyone can create a company).

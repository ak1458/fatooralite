# FatooraLite — Functional Specification

**Status:** For approval · The contract each module must satisfy. Every list view follows the
**loading → data | empty | error** rule; every mutation is zod-validated, RBAC-checked, and
tenant-scoped. No hardcoded counts, badges, or sample data in any production path.

Legend: `[O]` owner `[A]` admin `[Ac]` accountant `[Au]` auditor `[V]` viewer.

---

## 1. Auth

**Pages:** `/login`, `/register`, (`/forgot`, `/reset` basic).
**API:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

- Register: body `{ name, email, password, companyName, vatNumber }` → create `Company` (onboardingStatus=in_progress) + owner `User` (hashed pw) + session cookie → 201. Email unique; VAT format validated (15 digits, starts/ends 3).
- Login: `{ email, password }` → verify hash → set session → return user + onboardingStatus.
- Me: returns current user, company, role, permissions, onboardingStatus, active branch.
- Logout: clears cookie.
- **Acceptance:** can create a brand-new tenant with zero pre-existing data; wrong password shows inline error; protected routes redirect to `/login` when `AUTH_ENFORCE`.

## 2. Onboarding

**Pages:** `/onboarding` (4 steps). **API:** reuse `POST /api/onboarding/start`, `POST /api/onboarding/complete`; add `GET/PATCH /api/companies/[id]` for profile; `POST /api/branches`.

- Step state persisted on `Company.onboardingStep`. Cannot reach app modules until `complete`.
- ZATCA step calls real onboarding service (CSR → compliance CSID → checks → production CSID). On sandbox, uses sandbox base URL. Failures are shown with retry; user may defer (app flags "cannot clear/report yet").
- **Acceptance:** finishing the wizard sets onboardingStatus=complete and lands on `/dashboard`; reloading mid-wizard resumes the correct step.

## 3. Dashboard

**Page:** `/dashboard`. **API:** `GET /api/dashboard?companyId&branchId`.
Response **shape must match the page**: `{ kpis: { counters:{score,vat,inv,succ}, kpis:Kpi[] }, feed:FeedEvent[], volume:VolumeBar[], health:HealthBar[], integration:IntegrationItem[] }`.

- KPIs, health ring, API/integration status, live feed, volume — all from real data. (Current bug: page reads `data.kpis.kpis` but API returns a flat object → "Loading KPIs…" forever. Fix the shape.)
- Empty tenant → zeros + "Create your first invoice" CTA, not fake numbers.
- **Acceptance:** a fresh tenant shows real zeros; after issuing invoices the counters change accordingly; no "Loading…" persists once the request resolves.

## 4. Invoices

**Pages:** `/invoices` (list), `/invoices/new` (create), `/invoices/[id]` (view).
**API:** `GET /api/invoices?companyId&branchId&status`, `POST /api/invoices` (create draft), `POST /api/invoices/[id]/issue` (sign+submit), `POST /api/invoices/[id]/clear`, `GET /api/invoices/[id]/pdf`.

- List: real rows with status chips, search, status tabs with **real counts**. Fix infinite "Loading invoices…" (ensure fetch resolves + error/empty handling).
- Create: form posts to `issueInvoice`; standard requires buyer; simplified optional. Totals from money engine.
- Issue: standard→clear, simplified→report; store result + records + audit entries.
- **Acceptance:** create → appears in list with correct status; PDF downloads with QR; rejection shows code; no infinite spinner.

## 5. Credit / Debit Notes

**Pages:** `/credit-notes`, `/debit-notes`. **API:** `POST /api/notes` `{ type, originalInvoiceId, reasonCode, reason, lines }`.

- Must reference an existing invoice and a reason (ZATCA requirement). Runs the sign+submit pipeline with `documentType=credit|debit`.
- **Acceptance:** the form actually creates a note in the DB and it appears in the relevant list and Audit Vault. (Current: form is non-functional UI → must work.)

## 6. Customers

**Page:** `/customers`. **API:** `GET/POST /api/customers`, `PATCH/DELETE /api/customers/[id]`.
- CRUD; fields name(en/ar), VAT, CR, address, city, phone, email. Used in invoice buyer picker.
- **Acceptance:** list resolves (no infinite loading), add/edit/delete work, new customer selectable when creating an invoice.

## 7. Products

**Page:** `/products`. **API:** `GET/POST /api/products`, `PATCH/DELETE /api/products/[id]`.
- CRUD; fields name(en/ar), sku, unitPrice, vatCategory (S/Z/E/O), unitCode. Used in invoice lines.
- **Acceptance:** list resolves; products usable as line items.

## 8. ZATCA Integration

**Page:** `/integration`. **API:** `GET /api/integration?companyId` (connection state), `POST /api/onboarding/*` (CSID actions), `POST /api/integration/test` (sandbox compliance test).
- Shows: environment (sandbox/prod), CSID status + expiry, last connection check, compliance/production cert lifecycle, "run a test invoice" against sandbox.
- Replaces mock "Production / Latency / ERP / Compliance Engine / Create Test" tiles with real, explained controls (see Feature Docs).
- **Acceptance:** reflects the company's real `Certificate` rows; "test" actually calls the sandbox.

## 9. Compliance Center

**Page:** `/clearance`. **API:** `GET /api/clearance?companyId&branchId`.
- Real aggregates from `Invoice` + `ClearanceRecord`: counts cleared/pending/rejected, success %, avg latency, deadline tracker (simplified < 24h), PIH chain integrity, live feed.
- **Acceptance:** numbers equal DB reality (e.g., a fresh tenant shows 0/0/0, not 99.2%/3/14/87).

## 10. Audit Vault

**Page:** `/audit`. **API:** `GET /api/audit?companyId&query`, `GET /api/audit/[id]`.
- Search invoices; per-invoice view of XML, signed XML, QR, ZATCA responses, audit entries. Immutable.
- **Acceptance:** every issued invoice has retrievable artifacts; search works.

## 11. Analytics

**Page:** `/analytics`. **API:** `GET /api/analytics?companyId&branchId&range`.
- Real KPIs (totals, VAT collected, clearance success, rejection rate, active customers), revenue-by-customer, daily volume. Remove dummy fallback arrays.
- **Acceptance:** charts reflect real invoices; empty tenant shows empty states.

## 12. Reports

**Page:** `/reports`. **API:** `GET /api/reports?companyId&month|range&format=json|csv`.
- VAT return summary for a period; CSV export (already working); add date-range selection; this is the target of the AI "make a 7-day report" action.
- **Acceptance:** period selectable; CSV downloads real rows; AI action lands here.

## 13. AI Assistant

**Pages:** `/ai` (full) + `AssistantDock` (global). **API:** `POST /api/ai/chat` (RAG stream), `POST /api/ai/agent` (action), `GET /api/ai/insights`, `POST /api/ai/ingest` (admin: build/refresh corpus), `GET /api/ai/models`.
- Chat: embed query → pgvector retrieve (global ZATCA + this company) → grounded streamed answer + citations. Model selector. Mock-safe without keys.
- Agent: structured-intent → registry → zod + RBAC → real action → result.
- **Acceptance:** answers cite retrieved regulation chunks; "make a 7-day report" performs the action; model can be switched; works on every page.

## 14. Notifications

**Page:** `/notifications` + topbar bell panel. **API:** `GET /api/notifications`, `PATCH /api/notifications` (read), `POST /api/notifications` (generate from events).
- Badge = real unread count (remove hardcoded "4"). Bell opens a working panel. Generator creates events from compliance signals.
- **Acceptance:** badge matches unread; bell opens panel; empty tenant → no badge, empty panel with message.

## 15. Users & Roles

**Page:** `/users` (tabs: Users, Roles). **API:** `GET/POST /api/users`, `PATCH/DELETE /api/users/[id]`, `GET/POST /api/roles`, `PATCH/DELETE /api/roles/[id]`.
- Users: invite (email + role + designation), edit, disable/enable, remove. `[A][O]`.
- Roles: 5 system roles (read-only) + create custom role from permission checkboxes; assign to users.
- **Acceptance:** create a user and a custom role end-to-end; permissions actually gate API + UI. (Current: stub → must be built.)

## 16. Settings

**Page:** `/settings` (sectioned). **API:** `GET/PATCH /api/settings`, plus company/branch/ZATCA/AI endpoints.
- Sections per User Flows §11. Each control persists and takes effect.
- Appearance section is the canonical place to set theme/language/density.
- **Acceptance:** changing a setting persists across reload and affects behavior.

## 17. Cross-cutting acceptance

- No route returns or renders hardcoded sample data in production.
- Every nav badge is computed from real data or absent.
- Theme + language consistent on all screens; no hydration mismatch; `<body suppressHydrationWarning>`.
- All mutating routes: zod-validated, RBAC-checked, tenant-scoped, audited where relevant.

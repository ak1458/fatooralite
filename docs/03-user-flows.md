# FatooraLite — User Flows

**Status:** For approval · Pairs with [Functional Spec](./04-functional-spec.md)

Notation: `→` next step, `⤷` branch, `[gate]` permission/condition.

---

## 1. First-run: sign up → onboarding → dashboard (PRIMARY)

```
Visitor → /register
  → enter name, email, password, company name, VAT number
  → create Company (tenant) + owner User + session
  → Company.onboardingStatus = "in_progress"
  → redirect /onboarding

/onboarding (wizard, cannot skip to app until complete)
  Step 1  Company profile: legal name (en/ar), VAT number, CR number, address
  Step 2  ZATCA connection:
            → choose environment (sandbox | production)
            → generate keypair + CSR (automatic)
            → request Compliance CSID  ⤷ on success: run compliance checks (sample invoices)
            → request Production CSID  ⤷ stored encrypted; status = active
            (If user defers, they can finish later; app warns it can't clear/report yet.)
  Step 3  Branches/locations: add at least one branch (name, city) → set as active
  Step 4  Review → Finish
  → Company.onboardingStatus = "complete"
  → redirect /dashboard
```

**Guard:** any authenticated user whose company onboarding ≠ complete and who hits an app
route is redirected to `/onboarding` (except settings needed to finish it).

## 2. Returning user: login

```
Visitor → /login → email + password → /api/auth/login
  ⤷ invalid → inline error
  ⤷ valid + onboarding complete → /dashboard
  ⤷ valid + onboarding incomplete → /onboarding
```

(`/register` link on `/login` and vice-versa. Password reset = request → email/token → set new — basic v1.)

## 3. Active branch / location switch

```
Topbar branch selector (real dropdown) → list of company branches
  → select branch → active branch stored (context + persisted)
  → all branch-scoped data (invoices, dashboard, clearance) re-scopes to it
```

## 4. Create & issue an invoice

```
/invoices → "Create Invoice" → /invoices/new
  → pick type: standard | simplified
  → buyer: [standard] required (pick Customer or enter VAT-registered buyer)
           [simplified] optional
  → add lines: pick Product or free text → qty, unit price, VAT category
  → live totals (net, VAT, grand) computed by money engine
  → Save draft  ⤷ stored, status=draft
  → Issue:
       → issueInvoice(): compute totals → build UBL XML → ECDSA sign → PIH chain → QR → store (status=signed)
       → submit per type:
            standard  → CLEAR (synchronous) → status=cleared | rejected(+code)
            simplified→ REPORT (within 24h)  → status=reported | rejected(+code)
       ⤷ rejected → show ZATCA reason code + "Ask AI to fix" → AI explains + can prepare corrected XML
  → view invoice → download PDF (with QR) → XML available in Audit Vault
```

## 5. Credit / Debit note

```
/credit-notes (or /debit-notes) → New
  → select original invoice (search) → load its data
  → reason code + free reason (required by ZATCA)
  → adjust lines/amounts
  → Issue → same sign + submit pipeline, documentType = credit|debit, references original
```

## 6. Customers / Products (CRUD)

```
/customers → list (loading|data|empty|error) → Add → form (name, VAT, address, contact) → save → appears in invoice buyer picker
/products  → list → Add → form (name, sku, unit price, VAT category, unit code) → save → appears in invoice line picker
Each row → edit / delete [gate: accountant+]
```

## 7. Compliance monitoring

```
/clearance (Compliance Center)
  → real aggregates: cleared / pending / rejected counts, success rate, avg latency
  → live feed of ClearanceRecord events
  → deadline tracker: simplified invoices approaching the 24h reporting window
  → PIH chain integrity indicator
  → click a rejection → reason + remediation + "Ask AI"
```

## 8. AI Assistant (RAG + agentic) — available everywhere

```
Any page → AssistantDock (floating button) → slide-over chat
  → user types a question or command
  → RAG: retrieve ZATCA regs + tenant context → grounded streamed answer (with citations)
  → if the message implies an action → action registry:
        "create invoice for ACME 100 units of milk" → confirm → issueInvoice
        "make a 7-day report" → generateReport → navigate /reports
        "add user sara@x.com as accountant" [gate] → create invite
  → model selector in the dock header
Dedicated /ai page = full-screen version of the same assistant + insights panel.
```

## 9. Notifications

```
Topbar bell (badge = unread count, real)
  → click → notification panel (dropdown): list, mark read, "view all"
  → "view all" → /notifications (full list, filters)
Events that create notifications: invoice rejected, simplified invoice near 24h deadline,
CSID expiring, clearance failures, onboarding incomplete.
```

## 10. Users, roles & access (admin)

```
/users (Users & Roles) [gate: admin/owner]
  Users tab:  list → Invite user (email, role/designation) → invited→active
              edit role/title, disable/enable, remove
  Roles tab:  system roles (read-only) + create custom role (name + permission checkboxes)
              assign permissions: invoices.*, customers.*, users.*, settings.*, ai.*, etc.
```

## 11. Settings (admin)

```
/settings → sections:
  Company        legal info, branches/locations
  ZATCA          environment, CSID status, re-onboard, renew certificate
  Users & Roles  (links to /users)
  AI             model defaults, enable/disable, embedding/RAG status, re-ingest regs
  Appearance     theme (dark/light/system), language (en/ar), density
  Notifications  which events notify, channels
  Security       sessions, password, rate-limit/auth enforcement (owner)
  Billing        plan, usage, invoices (post-v1 placeholder but structured)
```

## 12. Error / empty / offline states (applies to all flows)

- Loading → skeleton/spinner with a **timeout fallback** (never infinite).
- Empty → friendly empty state with a primary action ("Create your first invoice").
- Error → message + retry; never a blank screen.
- ZATCA/AI down → queued or mock-safe behavior, clearly labeled, with retry.

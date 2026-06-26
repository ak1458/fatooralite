# FatooraLite — Feature Documentation

Plain-language explanation of every module: **what it is, why a user needs it, what
problem it solves, how it works.** This directly answers the "I don't understand what this
is for" questions.

---

## Authentication & Accounts
**What:** Login, sign up, sessions. **Why:** A commercial SaaS needs each business to have
its own secure account. **Problem solved:** Today there's a login form but no way to create
an account, and a fake user (Khalid) is pre-seeded. **How:** `/register` creates a company +
owner; `/login` authenticates; sessions are signed JWT cookies; passwords are hashed.

## Onboarding
**What:** A guided first-run wizard. **Why:** Issuing a legal e-invoice in Saudi Arabia
requires ZATCA credentials; a new user can't just start. **Problem solved:** Right now the
app drops you into a dashboard for a pre-made company. Instead, the **first** thing a new
user does is create *their* company and connect it to ZATCA. **How:** company profile →
ZATCA connection (CSID) → branches → finish → dashboard.

## Dashboard
**What:** The command center after onboarding. **Why:** Owners want an at-a-glance compliance
posture. **Problem solved:** Current KPIs are stuck "Loading…" and numbers are fake. **How:**
real KPIs (VAT collected, invoices, clearance success, certificate health), live clearance
feed, and 7-day volume — all from the tenant's data.

## Invoices
**What:** Create and manage e-invoices (standard B2B + simplified B2C). **Why:** This is the
core job. **Problem solved:** "Loading invoices…" forever; create doesn't really submit.
**How:** a form builds line items, the engine computes VAT, the document is signed and (per
type) cleared or reported to ZATCA, and a QR-stamped PDF is produced.

## Credit / Debit Notes
**What:** Corrections to issued invoices (refunds, adjustments). **Why:** ZATCA requires
formal credit/debit notes, not edited invoices. **Problem solved:** the note form looks real
but does nothing. **How:** select the original invoice, give a reason (mandatory), and issue
through the same signing/submission pipeline, referencing the original.

## Customers
**What:** Your buyers' directory. **Why:** Standard invoices need full buyer identity; reuse
saves typing. **Problem solved:** stuck on infinite loading. **How:** CRUD; customers appear
in the invoice buyer picker.

## Products
**What:** Your catalog of goods/services with price + VAT category. **Why:** Fast, consistent
invoice lines. **Problem solved:** "Loading Products…" forever. **How:** CRUD; products
appear as selectable invoice line items.

## ZATCA Integration — *explained in full*
**What it is:** The bridge between FatooraLite and the Saudi government's **Fatoora**
platform. To issue legal e-invoices, your billing device (an "EGS unit") must be
**onboarded**: it generates a cryptographic key, requests a certificate (**CSID**) from
ZATCA, passes compliance checks, and receives a **production certificate**. After that, the
app uses that certificate to **clear** standard invoices and **report** simplified ones.

**Why you need it:** Without a valid CSID and a working connection, your invoices are **not
legally valid** and standard invoices **cannot be shared with buyers** (they must be cleared
first). This module is what makes the whole product legal.

**What problem it solves:** ZATCA onboarding is a multi-step cryptographic process (CSR,
compliance CSID, sample-invoice checks, production CSID, environment switching). FatooraLite
does it for you and then monitors the connection.

**How it works / what the controls mean (replacing the confusing tiles):**
- **Environment (Sandbox vs Production):** sandbox is ZATCA's test gateway for setup and
  trials; production is live. You start in sandbox, then promote.
- **CSID status & expiry:** your certificate's health; renew before it expires or clearance stops.
- **Compliance test ("Create Test"):** sends sample invoices to ZATCA's sandbox to prove your
  setup is correct before going live.
- **Connection health / latency:** is the gateway reachable and how fast.
- ("ERP" tile, etc. were decorative — removed unless we add a real ERP import later.)

## Compliance Center
**What:** A real-time monitor of your invoices' legal status. **Why:** You must know what was
accepted, what's pending, what was rejected, and what's about to miss its **24-hour reporting
deadline**. **Problem solved:** the screen shows fake numbers (99.2%, 3 rejected, 14 pending,
87 clear). **How:** real aggregates from your invoices and ZATCA responses, a deadline tracker
for simplified invoices, the integrity of the **PIH hash chain**, and a live event feed.

## Audit Vault
**What:** A tamper-evident archive of every artifact exchanged with ZATCA (XML, signed XML,
QR, gateway responses). **Why:** Auditors and ZATCA can demand proof. **How:** every issued
invoice stores its artifacts; the vault lets you search and inspect them.

## Analytics
**What:** Business intelligence on your invoicing (revenue, VAT, top customers, clearance
rate). **Why:** Owners want trends, not just compliance. **Problem solved:** mock charts.
**How:** aggregates over real invoices; empty states when there's no data yet.

## Reports
**What:** VAT-return summaries and exports for a chosen period. **Why:** You file VAT with
ZATCA and your accountant needs CSVs. **How:** period/range selection, totals, CSV export.
This is also where the AI's "make a 7-day report" command lands.

## AI Assistant
**What:** An embedded expert that answers ZATCA questions and **does things for you**. **Why:**
The rules are complex; users want answers grounded in the actual regulations and the ability
to act by typing. **Problem solved:** today it's a non-working box with no model, no chatbot,
no real AI. **How:**
- **RAG (real retrieval):** ZATCA regulations + your own data are embedded into a **vector
  database**; your question retrieves the most relevant passages and the model answers from
  them, with citations — not guesses.
- **Agentic actions:** a safe server-side registry lets the assistant create invoices,
  generate reports, add users, etc., validated and permission-checked.
- **Model selection + streaming**, available on every page via a floating dock.
**Why a vector DB:** a relational database is great for structured records but can't do
semantic search ("find the rule about exempt categories"). A vector store enables real
meaning-based retrieval so the AI stops hallucinating.

## Notifications
**What:** Alerts for compliance-relevant events. **Why:** You must act before deadlines and
fix rejections fast. **Problem solved:** badge says "4" but the panel is empty and the bell is
dead. **How:** a generator turns real events (rejections, near-deadline, expiring CSID) into
notifications; the bell opens a working panel; the badge equals the unread count.

## Users & Roles
**What:** Team management with access control. **Why:** A business has an owner, accountants,
auditors — each needing different access. **Problem solved:** the section is empty. **How:**
invite users with a role/designation; manage 5 system roles plus custom roles built from
permission checkboxes; permissions gate both API and UI.

## Settings
**What:** Central administration. **Why:** Every aspect of the app should be configurable.
**Problem solved:** only a few placeholder options exist. **How:** sections for Company,
ZATCA, Users & Roles, AI, Appearance (theme/language), Notifications, Security, and Billing —
each control persisting and taking effect.

## Appearance (Theme & Language)
**What:** Dark/light themes and Arabic/English (RTL). **Why:** Saudi users expect polished
Arabic-first UX. **Problem solved:** theming is inconsistent and rough. **How:** a single
CSS-variable theme system, consistent across every screen, with standardized motion tokens
for smooth, premium animations.

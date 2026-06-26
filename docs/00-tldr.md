# FatooraLite — TL;DR

## What it is
A SaaS web app that lets a Saudi business issue **ZATCA-compliant e-invoices** (Phase 2
"Fatoora") without buying expensive ERP integrations. A business signs up, onboards its
ZATCA credentials, and from then on every invoice it creates is cryptographically signed,
QR-stamped, and either **cleared** (B2B) or **reported** (B2C) to the government gateway —
automatically.

## The problem
Since 2023, ZATCA requires all VAT-registered businesses in Saudi Arabia to integrate
their billing systems with the Fatoora platform. Standard (B2B) invoices must be
**cleared by ZATCA before** they're given to the buyer; simplified (B2C) invoices must be
**reported within 24 hours**. Every invoice needs an XML in a specific UBL format, an
ECDSA cryptographic stamp, a chained hash (PIH), and a TLV QR code. Getting this wrong
means rejected invoices, fines, and blocked sales. Most SMEs have no in-house way to do it.

## Who it's for
- **Business owner** — wants to be compliant and get paid, not learn cryptography.
- **Accountant** — issues invoices and credit/debit notes daily, files VAT returns.
- **Auditor** — needs a tamper-evident record of every document sent to ZATCA.
- **Admin** — manages users, roles, branches, and the ZATCA connection.

## How it works (happy path)
1. **Sign up** → create your company (no pre-made companies).
2. **Onboard** → enter company + VAT details, connect to ZATCA (CSID issuance), add branches/locations.
3. **Operate** → create invoices, customers, products; the app signs + submits to ZATCA.
4. **Monitor** → Compliance Center shows what cleared, what's pending, what's near its 24h deadline.
5. **Ask AI** → an embedded assistant answers ZATCA questions using real regulation retrieval (RAG) and can perform real actions ("create a 7-day report").

## Why it can be a business
Recurring SaaS subscription per company, tiered by invoice volume / branches / users.
Compliance is mandatory and ongoing, so churn is low. Add-ons: extra branches, API access,
premium support, archival retention.

## What makes it credible (not a mock)
The cryptographic core is real today: key generation, CSR, ECDSA-SHA256 signing, XAdES,
C14N, PIH chaining, TLV QR — all implemented in `lib/zatca/*`. The gap this project closes
is turning the **surface UI** into a **fully functional product**: real auth + onboarding,
real data everywhere, real RBAC, a real AI stack, and production polish.

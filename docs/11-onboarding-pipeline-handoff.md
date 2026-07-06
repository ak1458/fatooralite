# HANDOFF — Automated ZATCA Onboarding Pipeline (CCSID → Compliance → PCSID)

**For the next engineer/AI continuing this build.** This document is self-contained:
current state, exactly what already exists, the precise next task, ZATCA mechanics,
gotchas, and how to test. Read it top to bottom before writing code.

- **Repo:** `github.com/ak1458/fatooralite` · branch `feature/production-readiness`
- **Stack:** Next.js 16 (App Router) + Prisma 6 + Neon Postgres (pgvector) on Vercel
- **App root:** `fatooralite/` (all paths below are relative to it unless noted)
- **Last verified:** tsc clean · 89 unit tests pass · `next build` green · ZATCA
  signature validation 6/6 (`npm run zatca:validate`)

---

## 0. Current state (do NOT redo these)

The four Phase-2 crypto/architecture blockers are **done, committed, pushed, and
validated** (commit `b4e2e60`):

| Done | Where |
|---|---|
| C14N-11 signing (in-context SignedInfo, 3 exclusion transforms: UBLExtensions + cac:Signature + QR) | `lib/zatca/canonicalize.ts`, `lib/zatca/xades.ts` (`finalizeSignatureValue`) |
| PIH concurrency lock (`SELECT … FOR UPDATE` on InvoiceCounter, interactive tx) | `lib/db/repo.ts` (`nextChainSlot`/`commitChainHash`), `lib/services/invoice-service.ts` |
| QR Tag 9 from CSID (node-forge extracts CA signature) | `lib/zatca/tag9.ts` |
| 24h B2C reporting cron | `app/api/cron/zatca-reporting/route.ts`, `vercel.json`, schema `Invoice.reportingState`/`reportingDeadline` |

The signing pipeline is provably self-consistent under ZATCA's canonicalization.
**What has NOT been done: a live gateway round-trip**, because that needs a real
compliance CSID issued from a Fatoora-portal OTP (see §5). That is exactly what
this next task unblocks.

---

## 1. The task

Build the **Automated Onboarding Pipeline** for multi-tenant SaaS. When a Saudi
merchant signs up, they generate a **6-digit OTP** on their ZATCA Fatoora portal
and paste it into the app. The backend must orchestrate this strict sequence
**within the 60-minute OTP validity window**:

1. **Acquire Compliance CSID (CCSID)** — `POST {gw}/compliance`
   Generate a CSR (merchant VAT + EGS serial), submit with the OTP.
   ZATCA returns `binarySecurityToken` (CCSID), `secret`, `requestID`.
2. **Pass compliance scenarios** — `POST {gw}/compliance/invoices`
   Generate + sign (with the CCSID key) + submit the required dummy invoices
   (Standard, Simplified, Credit, Debit). All must be accepted.
3. **Acquire Production CSID (PCSID)** — `POST {gw}/production/csids`
   Submit the `requestID` from step 1. ZATCA returns the production
   `binarySecurityToken` (PCSID) + production `secret`. Persist in Neon.

The PCSID is the certificate `lib/zatca/tag9.ts` parses for QR Tag 9, the key that
signs all live invoices, and the credential (`token:secret` Basic auth) for the
clearance/reporting endpoints.

---

## 2. What ALREADY EXISTS (~80% built — orchestrate + harden, don't rebuild)

**Do not start from scratch.** Each step already has a service function + a route:

| Step | Service (`lib/services/onboarding-service.ts`) | Gateway client (`lib/zatca/onboarding.ts`) | Route |
|---|---|---|---|
| 1. CCSID | `startOnboarding({companyId, otp, commonName, organizationalUnit, mode})` | `requestComplianceCsid(csrBase64, otp, mode)` | `POST /api/onboarding/start` |
| 2. Compliance checks | `runComplianceChecks(companyId, mode, db)` — generates 4 samples (standard/simplified/credit/debit), signs with the CCSID key, submits | `submitComplianceInvoice({signedXmlBase64, invoiceHash, uuid}, {token, secret}, mode)` | (called inside step 3) |
| 3. PCSID | `completeOnboarding(companyId, mode)` — **runs the compliance checks and refuses to proceed unless all pass**, then requests the PCSID | `requestProductionCsid({token, secret, requestId}, mode)` | `POST /api/onboarding/complete` |

Supporting:
- **CSR builder:** `lib/zatca/csr.ts` — `generateCsr(privateKeyPem, publicKeyPem, subject, zatcaExtensions)`. Already emits the ZATCA custom extensions: `templateName` OID `1.3.6.1.4.1.311.20.2` (BMPString) and SAN `2.5.29.17` with the EGS serial/VAT/invoiceType/location/industry. Signed with ECDSA-SHA256 over secp256k1.
- **Keys:** `lib/zatca/keys.ts` — `generateKeyPair()` (secp256k1, the ZATCA curve — correct, do not change to P-256).
- **Cert storage:** Prisma `Certificate` model — `kind` = `compliance | production | local`; fields `token` (binarySecurityToken/CSID, base64), `secret`, `requestId`, `privateKey` (EC PEM, **encrypted at rest** via `lib/crypto/encrypt.ts`), `publicKey`, `status`, `issuedAt`, `expiresAt`.
- **Gateway base URLs:** `lib/zatca/client.ts` `gatewayBaseUrl(mode)` — sandbox = `…/developer-portal`, production = `…/core`. Set via `ZATCA_SANDBOX_BASE_URL` / `ZATCA_PRODUCTION_BASE_URL`, mode via `ZATCA_MODE`.
- **Sample signing uses the fixed pipeline:** `runComplianceChecks` calls `generateSignedInvoice` (`lib/zatca/index.ts`), which now includes `finalizeSignatureValue` (the C14N fix) and Tag 9. So compliance samples are signed identically to live invoices. Good.

---

## 3. What is MISSING / must be built or hardened

1. **Single orchestration endpoint** — `POST /api/onboarding/activate`
   One call: `{companyId, otp}` → runs step 1 → step 2 → step 3 sequentially,
   returns per-step status. Today it's two calls (`start`, then `complete`).
   The OTP is consumed in step 1; the whole race must finish inside 60 min, so a
   single server-orchestrated call is the right UX (merchant pastes OTP once).
   - Reuse `startOnboarding` then `completeOnboarding` (which already runs the
     checks). Wrap in one handler with clear per-step error surfacing.
   - Return shape: `{ step: "ccsid"|"compliance"|"pcsid"|"done", ccsid?, complianceResults?, error? }`.

2. **OTP lifecycle + retry semantics**
   - OTP is single-use and expires in ~60 min. If step 1 succeeds but step 2/3
     fail, **do not require a new OTP** — the CCSID + `requestId` are already
     stored; allow re-running steps 2–3 against the stored compliance cert.
     `completeOnboarding` already reads the stored compliance cert, so expose a
     "resume" path that skips step 1.
   - Surface a precise error when ZATCA rejects the OTP (expired/invalid) so the
     merchant knows to generate a fresh one.

3. **Compliance scenario coverage — verify against the real gateway**
   `runComplianceChecks` currently submits 4 fixed samples. ZATCA's required set
   depends on the CSR's `invoiceType`:
   - `1100` (standard **and** simplified) → must pass BOTH standard clearance and
     simplified reporting samples, **plus** credit + debit notes for each type
     actually enabled. Confirm the exact required matrix against the sandbox
     response — ZATCA returns which scenarios are still `NOT_PASSED`.
   - Each sample must chain (PIH) correctly and carry a valid signature. They now
     do (shared pipeline), but the **compliance samples must use the compliance
     private key**, which `runComplianceChecks` already decrypts. Verify.

4. **CSR extension format — the #1 real rejection cause after signing**
   `lib/zatca/csr.ts` builds the extensions, but the exact byte format is a known
   ZATCA gotcha and has **not been round-tripped against the live gateway**.
   Verify against the sandbox:
   - `templateName` value must be **`PREZATCA-Code-Signing`** for the compliance
     (sandbox) CSID and **`ZATCA-Code-Signing`** for production. Check
     `generateCsr` / `onboarding-service.ts` pass the right one per `mode`.
   - SAN must contain the EGS serial (`1-<solutionName>|2-<model>|3-<uuid>`), the
     VAT (`2.5.4.5`-style), the title (invoiceType `0100/1000/1100`), and the
     industry — in ZATCA's exact directoryName/otherName structure.
   - If the gateway returns a CSR-format error on `POST /compliance`, this is
     where to look first.

5. **Persistence + activation of the PCSID**
   - On step 3 success, `completeOnboarding` already deactivates the old
     production cert and stores the new one as `kind=production, status=active`.
     Confirm `getActiveCertificate` (in `lib/db/repo.ts`) returns it and that
     `submitInvoice` (`lib/services/clearance-service.ts`) uses `token:secret` for
     Basic auth. It rejects `secret === "LOCAL-DEV-SECRET"` — make sure a real
     PCSID isn't accidentally flagged local.
   - Set `Company.onboardingStatus = "complete"` so the first-run wizard guard
     releases (check `proxy.ts` / onboarding UI).

6. **Concurrency / idempotency**
   - Guard against double-submission (merchant clicks twice): a company already
     mid-onboarding shouldn't fire two CCSID requests. Use a status flag or a
     unique in-flight lock.

7. **UI** — `app/onboarding/` wizard: OTP input → progress (step 1/2/3 with live
   status) → success. There is an existing onboarding wizard; wire it to the new
   `/api/onboarding/activate` and show per-step progress + the 60-min countdown.

---

## 4. ZATCA API mechanics (exact wire details)

All calls: `Accept-Version: V2`. Base URL from `gatewayBaseUrl(mode)`.

**Step 1 — `POST /compliance`**
- Headers: `OTP: <6-digit>`, `Content-Type: application/json`, `Accept: application/json`.
- Body: `{ "csr": "<base64 of PEM CSR>" }`.
- Response: `{ requestID, binarySecurityToken, secret, dispositionMessage }`.
- `binarySecurityToken` = the CCSID (base64 DER cert). Store as `Certificate.token`.

**Step 2 — `POST /compliance/invoices`** (repeat per sample)
- Auth: `Authorization: Basic base64(binarySecurityToken:secret)` (the CCSID).
- Headers: `Accept-Version: V2`, `Accept-Language: en`.
- Body: `{ "invoiceHash", "uuid", "invoice": "<base64 signed XML>" }`.
- Response: `{ clearanceStatus | reportingStatus, validationResults }`.
  - Standard sample → expect `clearanceStatus: "CLEARED"`.
  - Simplified sample → expect `reportingStatus: "REPORTED"`.
  - Any `NOT_CLEARED`/`NOT_REPORTED` or `validationResults.status: "ERROR"` = fail;
    read `validationResults.errorMessages[*].code` (BR-KSA-*) for the reason.

**Step 3 — `POST /production/csids`**
- Auth: `Authorization: Basic base64(CCSID_token:CCSID_secret)`.
- Body: `{ "compliance_request_id": "<requestID from step 1>" }`.
- Response: `{ requestID, binarySecurityToken, secret }` = the **PCSID**. Store as
  `Certificate.kind=production, status=active`.

**Live invoicing afterward** (already implemented in `clearance-service.ts`):
- Clearance (standard): `POST /invoices/clearance/single`, header `Clearance-Status: 1`.
- Reporting (simplified): `POST /invoices/reporting/single`.
- Auth: `Basic base64(PCSID_token:PCSID_secret)`.

---

## 5. How to test (the ONLY way to truly validate)

Local crypto is already proven (`npm run zatca:validate` → 6/6, gateway reachable
HTTP 401). A **real end-to-end** test needs a Fatoora **sandbox/simulation portal
account** to generate an OTP:

1. Register on the ZATCA Fatoora **simulation** portal, create an EGS unit, get a
   6-digit OTP (valid 60 min).
2. Point env at simulation: `ZATCA_MODE=sandbox`,
   `ZATCA_SANDBOX_BASE_URL=https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation`
   (confirm the current simulation base URL — ZATCA moved it before).
3. Call `POST /api/onboarding/start` (or the new `/activate`) with the OTP.
4. Watch for: CSR accepted (step 1), all compliance samples `CLEARED`/`REPORTED`
   (step 2), PCSID issued (step 3).
5. Then issue a real simplified invoice and confirm Tag 9 is populated from the
   PCSID and the gateway reports it.

`scripts/validate-zatca.ts` already submits a signed sample to
`/compliance/invoices` if `ZATCA_COMPLIANCE_TOKEN`/`ZATCA_COMPLIANCE_SECRET` are
set — extend it, or add `scripts/onboard-sandbox.ts`, to drive the full 3-step
flow with a pasted OTP for repeatable testing.

---

## 6. Env vars

Required already: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_ENFORCE=true`,
`ENCRYPTION_KEY` (encrypts cert private keys — **must be stable**, rotating it
orphans stored keys).

ZATCA: `ZATCA_MODE` (`sandbox`|`simulation`|`production`),
`ZATCA_SANDBOX_BASE_URL`, `ZATCA_PRODUCTION_BASE_URL`.

Cron: `CRON_SECRET` (Vercel Cron bearer). Reporting cron already wired.

---

## 7. Gotchas / landmines

- **secp256k1 is correct** — ZATCA mandates it. Do not "fix" to P-256/secp256r1.
- **`ENCRYPTION_KEY` stability** — cert private keys are AES-encrypted at rest;
  changing the key forces every merchant to re-onboard.
- **Interactive transactions on Neon** — `issueInvoice` holds a `FOR UPDATE` lock
  across signing. Use the **pooled** `DATABASE_URL`; keep tx work fast.
- **Compliance samples share the live signing pipeline** — any change to
  `canonicalize.ts`/`xades.ts` affects both. Re-run `npm run zatca:validate` after
  touching them.
- **OTP is single-use, ~60 min** — never re-request the CCSID on a step-2/3 retry.
- **CSR templateName differs sandbox vs prod** (`PREZATCA-` vs `ZATCA-Code-Signing`).
- **Don't log OTP or secrets.** Redact in any error surfaced to the client/logs.
- **`next build` runs with NODE_ENV=production** — `lib/env.ts` skips the prod-only
  secret requirements during the build phase (`NEXT_PHASE === "phase-production-build"`).
  Keep that guard if you touch env validation.

---

## 8. First moves for the next session

1. Read `lib/services/onboarding-service.ts` and `lib/zatca/onboarding.ts` in full
   (they're short) — that's the whole pipeline.
2. Build `POST /api/onboarding/activate` orchestrating start → complete, with a
   resume path that skips step 1 when a compliance cert already exists.
3. Get a **simulation** OTP and run the full flow against the sandbox — fix CSR
   extension / compliance-scenario issues the gateway reports (§3.3, §3.4).
4. Wire the onboarding UI to `/activate` with per-step progress + 60-min countdown.
5. After a green sandbox onboarding, issue a live simplified invoice and confirm
   Tag 9 + reporting.

Verification commands: `npx tsc --noEmit` · `npx vitest run` · `npm run build` ·
`npm run zatca:validate`.

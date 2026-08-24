# Production Readiness & Deployment — Fatoora Lite Pro

Everything you need before the investor demo and before deploying, in one
place. Written 2026-08-05; **updated 2026-08-19 after the full remediation
programme (Phases 1–5) and all nine D1–D9 decisions were implemented** —
several items below that were open gaps on 2026-08-05 are now fixed;
read this version, not a cached copy.

Read [`START-HERE.md`](../START-HERE.md) for engineering state and what is left
to build. **This file is for you, the owner** — the actions only you can take,
the things to configure, and the checks to run.

---

## TL;DR — before the demo

Do these three, in this order:

1. **Generate a ZATCA Fatoora portal OTP and run the onboarding harness.** This
   is the single highest-value action. It turns the dashboard genuinely green
   and gives the first real proof the signing engine verifies at ZATCA.
   ```bash
   cd fatooralite
   npx tsx scripts/zatca-sandbox-onboard.ts <otp>
   ```
   OTPs expire within the hour — generate it and run immediately.

2. **Demo the AI assistant from the Almarai account, not a fresh trial.**
   AI *write* actions are Pro-only. On a trial tenant the agent will refuse
   them on stage. Seeded demo login: `khalid@almarai.example` / `owner1234`.

3. **Skim "Do not say this in the deck"** at the bottom of this file. Three
   features are enforced but not built, and a few more are built but
   unverified in production (WhatsApp, ZATCA production certification).

---

## 1. Blockers — only you can clear these

| # | Blocker | Why it matters | What to do |
| --- | --- | --- | --- |
| 1 | **Fatoora portal OTP** | Dashboard honestly shows 0% readiness / "Not connected" until a real ZATCA onboarding runs. Also the only independent proof the XAdES signing fix works. This is Phase 6's X1, still open — see `docs/audit/remediation-ledger.md`. | Log in to the ZATCA Fatoora portal → *Onboard new solution* → copy the OTP → run the harness above within the hour. |
| 2 | **Moyasar merchant account** | Checkout is built and inert (Phase 6's X3). The webhook payload shape was written from published docs, never seen live. | Complete Moyasar KYC + bank details. Then run one sandbox transaction and confirm the payload matches `parseInvoiceWebhook` in `lib/billing/moyasar.ts`. |
| 3 | **Meta Business verification + WhatsApp template approval** — **deferred by your own instruction, not started** | WhatsApp invoice delivery is built (`POST /api/invoices/:id/whatsapp`) behind a provider dispatcher (`lib/whatsapp/send.ts`) that supports two transports. Meta's Cloud API (`lib/whatsapp/providers/meta.ts`) remains the intended production/compliance-grade path but is completely inert without `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_INVOICE_TEMPLATE_NAME`. **In the meantime, OpenWA (a self-hosted gateway) is wired up as a temporary transport** — see the new row below. No production send has been verified through either provider. | When ready: complete Meta Business verification, register the sending phone number, get an invoice-delivery message template approved, then set the three env vars below — Meta takes over from OpenWA automatically the moment all three are set, no other change needed. |
| 3b | **OpenWA session pairing** *(new, 2026-08-19 — D8 addendum, temporary transport)* | `lib/whatsapp/providers/openwa.ts` is inert without `OPENWA_API_URL`/`OPENWA_API_KEY`/`OPENWA_SESSION_ID`, and even once those are set, the session itself must be paired by scanning a QR code once. **OpenWA is not, and must not be treated as, the production/compliance-grade WhatsApp path** — its own docs warn of a real account-ban risk and say to treat it as "not approved" for regulated sectors. It exists only to keep WhatsApp delivery available and low-cost while blocker #3 stays deferred. | Run an OpenWA instance (self-hosted — see https://github.com/rmyndharis/OpenWA for setup, e.g. its Docker Compose). Create a session and pair it via **OpenWA's own dashboard** (default `http://localhost:2785`) — this app deliberately has no QR-pairing UI. Once paired, set the three env vars below. Check `GET /api/operator/whatsapp-session` (with the `OPERATOR_SECRET` bearer) to confirm it reports `available: true`. |
| 4 | **Legal copy still needs a lawyer, even though it's now drafted** | `/terms`, `/privacy`, `/refund-policy`, `/cancellation-policy`, `/data-retention`, `/acceptable-use` were rewritten 2026-08-19 (D4) from placeholder brackets into substantive text grounded in what the product actually does — but **none of it has been reviewed by qualified counsel**, and the DRAFT banners say so. Shipping as-is to real customers is still a real liability. | Have a lawyer review the drafted text (it's real prose now, not `[Placeholder: ...]` — review should be faster than starting from scratch) and approve or amend it. |
| 5 | **Final Pro pricing** | `PRO_PRICE_HALALAS` in `lib/billing/entitlements.ts` is still a **149 SAR placeholder**, deliberately (D3, 2026-08-19: self-serve checkout stays off, no price invented ahead of research). | Decide the price. Market research (launch-plan Phase 7) was intended to inform this and has not been done. |
| 6 | ~~**Branch protection on `main`**~~ **DONE 2026-08-20.** | PR required (0 reviewers — solo repo), `lint · test · build` CI check required and must be current with `main` (`strict: true`), force-push and deletion blocked. `enforce_admins: false` — you can still bypass in a genuine emergency. | Nothing further — verify anytime: `gh api repos/ak1458/fatooralite/branches/main --jq .protected`. |
| 7 | ~~**Nothing is pushed**~~ **DONE 2026-08-20.** | Pushed 2026-08-20, opened as PR #16, CI green, merged into `main` (merge commit `69dca91`) the same day. `main` now carries the full remediation programme — Phases 1–7, D1–D9, OpenWA transport, the proxy fix. | Nothing further. Note `main` is not git-connected to Vercel, so this merge alone did not trigger a deploy — the 2026-08-20 CLI-access session's `vercel --prod` deploy already carries this same code; a fresh deploy from `main` is only needed if you want Vercel's build to track it directly going forward. |

**Two items that were open on 2026-08-05 are now closed, so they're gone
from this list**: the audit-trail gap (§8 used to list "no audit trail
outside invoices" — fixed Phase 1/W2, `SecurityEvent`) and branch-scoped
data (§8 used to list "branch selector doesn't scope data" — fixed Phase
3/W10). If you're working from a memory of the 2026-08-05 version of this
doc, both of those are done; don't re-flag them.

---

## 2. Environment variables

### Required — the app refuses to boot in production without these

| Variable | How to generate / where from | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Neon dashboard → connection string (pooled) | Postgres + pgvector. |
| `DIRECT_URL` | Neon dashboard → direct (non-pooled) | Used by Prisma migrations. |
| `AUTH_SECRET` | `openssl rand -base64 32 \| tr -d '\r\n'` | **Must not be the `.env.example` placeholder** — now rejected at boot. Rotating it only logs everyone out. |
| `ENCRYPTION_KEY` | `openssl rand -base64 32 \| tr -d '\r\n'` | **⚠️ NEVER rotate this independently of the database.** It is the only key that decrypts stored ZATCA private keys. Losing it means losing every tenant's signing certificate, permanently. Keep an offline copy. |
| `CRON_SECRET` | `openssl rand -base64 32 \| tr -d '\r\n'` | Protects the ZATCA reporting **and reconcile** crons. Also set in `vercel.json`. |
| `AUTH_ENFORCE` | `true` | Anything other than the literal `true` fails the boot guard. |
| `APP_URL` and `NEXT_PUBLIC_APP_URL` | Your deployed URL, no trailing slash | Set both to the same value (pre-existing naming split, not unified). Without them: checkout 500s, password-reset links and sitemap/robots fall back to `http://localhost:3000`. Boot now refuses to start in production without at least one set. |

> **Windows note:** use `tr -d '\r\n'`, **not** `tr -d '\n'`. A trailing `\r`
> silently corrupts the value and produces confusing auth failures.

### Optional — features ship inert without them

| Variable | Enables | Without it |
| --- | --- | --- |
| `GROQ_API_KEY` + `AI_PROVIDER=groq` | Fast AI for live demos | Falls back to OpenRouter free models (slower, occasionally rate-limited). |
| `OPENROUTER_API_KEY` | AI assistant (current default) | Assistant runs in mock mode. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Enterprise AI backends | Not used unless `AI_PROVIDER` selects them. |
| `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET` | Paid upgrades | Checkout returns 501 with a friendly message. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Password-reset emails, invoice email delivery (N7) | Reset links are console-logged, not delivered; invoice emails log a mock send instead of sending. |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_INVOICE_TEMPLATE_NAME` | WhatsApp invoice delivery via **Meta** (D8) — the production/compliance-grade path | All three unset (or even one missing) means Meta isn't the active provider — see blocker #3. The `whatsappInvoiceDelivery` feature flag also defaults OFF per company regardless. |
| `OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID` *(new, 2026-08-19)* | WhatsApp invoice delivery via **OpenWA** — a **temporary** self-hosted transport, see blocker #3b | Used only when the Meta vars above are unset. Never describe this as the production path in any customer-facing material. |
| `WHATSAPP_PROVIDER` *(new, 2026-08-19)* | Forces `meta` or `openwa` when both happen to be configured at once | Rare — a supervised migration window. Unset means automatic selection (Meta wins if configured). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting | Falls back to in-memory (fine for a single instance, not for serverless scale). |
| `ZATCA_MODE` | `sandbox` or `production` | Defaults to sandbox. |
| `OPERATOR_SECRET` | Global AI knowledge re-index (`POST /api/ai/ingest {scope:"global"}`) **and, since 2026-08-19, the read-only cross-tenant support view** (`GET /api/operator/companies` — D7) | Both endpoints return 403 to everyone, including tenant owners, when unset — there is deliberately no platform-admin User role. Re-index the shared corpus at deploy time with `scripts/ingest-global.ts` instead of the HTTP path. Treat this secret as sensitive: whoever holds it can read every tenant's license state, ZATCA certificate status, and last-seen time across the whole platform (read-only, no writes). |

### Cron cadence — open question

`vercel.json` runs both the reporting and reconcile crons **daily**
(`0 3 * * *` / `0 4 * * *`); code comments describing a 15-minute cadence
predate that and are aspirational, not current behaviour. A B2C simplified
invoice must reach ZATCA within 24h of issuance — a daily-only retry loop
makes that deadline tight if an early attempt fails. If the Vercel plan
supports sub-daily cron (`*/15 * * * *`), both schedules should move to it;
that is a deploy-config change, not a code change, and needs the owner's
sign-off before touching `vercel.json` again.

---

## 3. Pre-deploy gates

All five must pass. They run in this order in CI, and **a failure in an early
one silently skips the rest** — that happened for a long time with lint.

```bash
cd fatooralite
npm run lint                       # must exit 0
npm audit --audit-level=critical
npx tsx scripts/validate-zatca.ts  # 7/7 local signing checks
npm run build
```

The test suite is no longer a single `npx vitest run` — it needs
`TEST_DATABASE_URL` set to `fatoora_audit`'s DIRECT connection string, and
must run in two groups (6 files that reset the schema, run one at a time;
the other 87 together with `--no-file-parallelism`). See
`docs/SESSION_HANDOFF_2026-08-18.md` §5 for the exact commands — this
isn't a CI gate you need to run yourself before deploying (CI runs it),
but if you want to verify locally, use that section, not a bare
`npx vitest run`.

Current status (2026-08-19): **all five green** — 93 test files, 612
tests, 0 failed, 0 skipped; 7 high / 0 critical `npm audit` findings
(accepted risk, no fix exists — see `docs/19-operations-runbook.md` §6);
lint 0 errors; ZATCA 7/7; build clean.

---

## 4. Deploy steps

1. Merge `audit/production-readiness-2026-08-18` → `main` (ask me; nothing
   is pushed).
2. Set every required variable above in the Vercel project.
3. Confirm Vercel **Root Directory is `fatooralite`**. Do not move or rename
   that folder — deployment config depends on the path.
4. Apply migrations against the production database:
   ```bash
   cd fatooralite && npx prisma migrate deploy
   ```
   **19 migrations will apply** if this is the first deploy since
   2026-08-18/19 (up from the 18 the pre-D1–D9 session already resolved
   for `neondb` — see `docs/SESSION_HANDOFF_2026-08-18.md` §3.7). The
   newest, `20260819100000_row_level_security` (D6), is additive and safe:
   it creates a new non-login Postgres role and enables RLS policies that
   apply **only** to that new role, never to the connection this app
   already uses for every query — nothing in the app's runtime behaviour
   changes when this migration lands, by design (see `docs/audit/
   decision-register.md` D6 for why).
5. Deploy.
6. Run the post-deploy checks below.

> **The production database is currently the same Neon instance as dev.**
> Separate them before real customers exist, or a seed/reset will destroy
> live data.

---

## 5. Post-deploy verification

| Check | Expected |
| --- | --- |
| `GET /api/health` | `200`, `"database":"connected"` |
| `GET /api/companies` unauthenticated | `401` with a **JSON** body, not an HTML login page |
| `GET /dashboard` unauthenticated | `307` redirect to `/login` |
| `GET /api/cron/zatca-reporting` with no bearer | `401` |
| …with the correct `CRON_SECRET` bearer | `200` |
| `GET /robots.txt`, `/sitemap.xml`, `/sw.js` | `200`, publicly reachable |
| Register a throwaway company | Completes all six wizard steps and reaches the dashboard |
| Issue one invoice | Signed, QR present, PDF downloads |
| `GET /api/operator/companies` with no `Authorization` header | `403` |
| …with `Authorization: Bearer <OPERATOR_SECRET>` | `200`, a list of every company with license/ZATCA/last-seen fields, no write endpoint exists at this path |
| `GET /api/operator/whatsapp-session` with the correct `OPERATOR_SECRET` bearer | `200`, `{provider, configured, available, ...}` — `available:true` only once a provider is actually configured and (for OpenWA) its session is paired and `status:"ready"` |

---

## 6. Rollback

- **Code:** redeploy the previous Vercel deployment.
- **Database:** Neon Point-in-Time Restore (see `docs/09-deployment.md`).
- **Full history backup:** `archive/backups/2026-08-04-pre-reorg-backup.bundle`
  (git bundle of every ref before this session's work). It sits on the same
  disk as the repo — **copy it somewhere else** if the machine itself is the
  risk you are insuring against.

---

## 7. What changed in this session (context for reading the code later)

Five bugs, each of which broke a headline feature, and **none were visible in
source review** — they were found by running the product as a brand-new tenant:

1. **No new tenant could finish onboarding.** `invoiceTypes` was required by
   the server's completion guard but collected by no screen. Only the seeded
   demo company worked — which is why every prior test missed it.
2. **Registration created the account, then crashed and locked the user out.**
   Session minting sat outside the try/catch: the company committed, the
   handler escaped, the browser got an empty 500, and every retry said "company
   already exists".
3. **The seller on a signed invoice came from the request body.** Any
   authenticated user could issue a cryptographically signed invoice bearing
   another business's VAT number. Now derived from the authenticated tenant.
4. **Local self-signed certificates were stored as `kind: "production"`,** so
   the dashboard told tenants who had never contacted ZATCA that they were
   "Production Connected" to `api.zatca.gov.sa`.
5. **AI tool calling failed on every request** — the flagship demo feature. The
   agent forces `tool_choice: "required"`; the free fallback model rejects it.

Plus the dashboard was largely decoration: "100% Compliant" was a hardcoded
string next to a 0.0 score, "Real-Time API Health" drew a fixed rising line
beside its own "N/A" labels, and "Invoice Volume" printed a bar-chart
percentage as a count (a new tenant's first invoice showed as **"100 invoices
today"**). All now derive from real state or say plainly that no data exists.

Earlier in the session: Next.js 16.3.0 (nine advisories including an App Router
proxy bypass — this app's auth gate *is* the proxy), trial/Pro licensing
enforced server-side, dashboard queries cut to one round trip each (KPIs 4.2×
faster; analytics stopped loading whole tables), accessibility fixes, and CI's
lint gate made to pass for the first time.

---

## 8. Do not say this in the deck

Honesty items — each is enforced in code but has **nothing behind it**:

- **API access / API keys** — declared, gated, not built.
- **Custom invoice branding** — declared, gated, not built.
- **Advanced reports** — declared, gated, not built.

**Fixed since 2026-08-05, removed from this list**: bulk import/export
*is* built now (N4, Phase 5) — CSV-only (not xlsx), customers and products
(not invoices), synchronous with size/row caps. Don't undersell it, and
don't oversell it as more than that scoped first cut either.

Also true and worth not overstating:

- The signing engine is **not yet certified against a live ZATCA gateway**. The
  fixes are high-confidence and locally verified (7/7 checks), but blocker #1
  is what makes that claim provable.
- **No WhatsApp message has ever actually been sent, through either
  provider** *(2026-08-19)*. Both the Meta path and the temporary OpenWA
  path are built and unit-tested against their documented API shapes, but
  only against mocks — see blockers #3 and #3b. **Do not describe OpenWA
  as a production-grade integration** — it's a self-hosted, reverse-
  engineered gateway used only to keep delivery available while Meta
  verification is deferred; its own docs recommend against it for
  regulated sectors.
- Postgres row-level security exists (D6, 2026-08-19) as a tested,
  adversarially-proven mechanism, but is **not yet used by any real
  request the app serves** — it's a built and verified primitive, not a
  live protection. Tenant isolation in production is still enforced by
  application code only (already tested 25 ways in the original audit).
- No end-to-end test proves the trial cap or expiry through the real UI.

Two items that used to be here are fixed and removed as of 2026-08-19 —
see the note under the blockers table above (audit trail, branch scoping).

---

## 9. Invariants — things that look like bugs and are deliberate

Do not "fix" these, and tell any future developer the same. Each has the
reasoning in a comment beside it in the code.

- **Clearance/reporting is never plan-gated.** An expired trial can still file
  invoices it already issued — ZATCA requires simplified invoices reported
  within 24 hours, so gating it would turn a billing state into a regulatory
  violation.
- **An expired trial is read-only, not locked out.** Existing invoices stay
  viewable and exportable.
- **The UI plan gate fails open.** An unknown or failed plan read allows the
  action; the server returns 402 anyway. Failing closed would lock a paying
  customer out over one dropped request.
- **A missing subscription row resolves to `expired`, not `trial`** — so a
  deleted row cannot silently re-grant a trial.
- **`AUTH_ENFORCE` is secure-by-default** (`!== "false"`) in all six call sites.
- **No AI attribution anywhere in the repo.** Enforced by
  `.githooks/commit-msg`; enable with `git config core.hooksPath .githooks`.

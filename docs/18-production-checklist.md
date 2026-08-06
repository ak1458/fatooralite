# Production Readiness & Deployment — Fatoora Lite Pro

Everything you need before the investor demo and before deploying, in one
place. Written 2026-08-05.

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

3. **Skim "Do not say this in the deck"** at the bottom of this file. Four
   features are enforced but not built.

---

## 1. Blockers — only you can clear these

| # | Blocker | Why it matters | What to do |
| --- | --- | --- | --- |
| 1 | **Fatoora portal OTP** | Dashboard honestly shows 0% readiness / "Not connected" until a real ZATCA onboarding runs. Also the only independent proof the XAdES signing fix works. | Log in to the ZATCA Fatoora portal → *Onboard new solution* → copy the OTP → run the harness above within the hour. |
| 2 | **Moyasar merchant account** | Checkout is built and inert. The webhook payload shape was written from published docs, never seen live. | Complete Moyasar KYC + bank details. Then run one sandbox transaction and confirm the payload matches `parseInvoiceWebhook` in `lib/billing/moyasar.ts`. |
| 3 | **Reviewed legal copy** | `/terms`, `/privacy`, `/refund-policy`, `/cancellation-policy`, `/data-retention`, `/acceptable-use` all carry DRAFT banners with bracketed placeholders. Shipping these as-is is a real liability. | Have a lawyer produce final copy; replace the placeholder text. |
| 4 | **Final Pro pricing** | `PRO_PRICE_HALALAS` in `lib/billing/entitlements.ts` is a **149 SAR placeholder**. | Decide the price. Market research (launch-plan Phase 7) was intended to inform this and has not been done. |
| 5 | **Branch protection on `main`** | Confirmed unset. Nothing stops a force-push over history. | GitHub → Settings → Branches → protect `main` (require PR, require CI green). |
| 6 | **Nothing is pushed** | 35 commits sit on `feature/production-readiness`; `main` is that far behind. Held local at your instruction. | Tell me when to merge and push. Note it may trigger a Vercel production deploy. |

---

## 2. Environment variables

### Required — the app refuses to boot in production without these

| Variable | How to generate / where from | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Neon dashboard → connection string (pooled) | Postgres + pgvector. |
| `DIRECT_URL` | Neon dashboard → direct (non-pooled) | Used by Prisma migrations. |
| `AUTH_SECRET` | `openssl rand -base64 32 \| tr -d '\r\n'` | **Must not be the `.env.example` placeholder** — now rejected at boot. Rotating it only logs everyone out. |
| `ENCRYPTION_KEY` | `openssl rand -base64 32 \| tr -d '\r\n'` | **⚠️ NEVER rotate this independently of the database.** It is the only key that decrypts stored ZATCA private keys. Losing it means losing every tenant's signing certificate, permanently. Keep an offline copy. |
| `CRON_SECRET` | `openssl rand -base64 32 \| tr -d '\r\n'` | Protects the ZATCA reporting cron. Also set in `vercel.json`. |
| `AUTH_ENFORCE` | `true` | Anything other than the literal `true` fails the boot guard. |

> **Windows note:** use `tr -d '\r\n'`, **not** `tr -d '\n'`. A trailing `\r`
> silently corrupts the value and produces confusing auth failures.

### Optional — features ship inert without them

| Variable | Enables | Without it |
| --- | --- | --- |
| `GROQ_API_KEY` + `AI_PROVIDER=groq` | Fast AI for live demos | Falls back to OpenRouter free models (slower, occasionally rate-limited). |
| `OPENROUTER_API_KEY` | AI assistant (current default) | Assistant runs in mock mode. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Enterprise AI backends | Not used unless `AI_PROVIDER` selects them. |
| `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET` | Paid upgrades | Checkout returns 501 with a friendly message. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Password-reset emails | Reset links are console-logged, not delivered. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting | Falls back to in-memory (fine for a single instance, not for serverless scale). |
| `ZATCA_MODE` | `sandbox` or `production` | Defaults to sandbox. |

---

## 3. Pre-deploy gates

All five must pass. They run in this order in CI, and **a failure in an early
one silently skips the rest** — that happened for a long time with lint.

```bash
cd fatooralite
npm run lint                       # must exit 0
npm audit --audit-level=critical
npx vitest run                     # 285 passed / 43 skipped (DB-gated)
npx tsx scripts/validate-zatca.ts  # 7/7 local signing checks
npm run build
```

Current status: **all five green.**

---

## 4. Deploy steps

1. Merge `feature/production-readiness` → `main` (ask me; nothing is pushed).
2. Set every required variable above in the Vercel project.
3. Confirm Vercel **Root Directory is `fatooralite`**. Do not move or rename
   that folder — deployment config depends on the path.
4. Apply migrations against the production database:
   ```bash
   cd fatooralite && npx prisma migrate deploy
   ```
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

- **Bulk import / export** — declared, gated, not built.
- **API access / API keys** — declared, gated, not built.
- **Custom invoice branding** — declared, gated, not built.
- **Advanced reports** — declared, gated, not built.

Also true and worth not overstating:

- The signing engine is **not yet certified against a live ZATCA gateway**. The
  fixes are high-confidence and locally verified (7/7 checks), but blocker #1
  is what makes that claim provable.
- There is **no audit trail outside invoices** — no record of failed logins,
  permission denials, or role changes. Real gap for a compliance product.
- The branch selector **does not scope data** yet (PRD FR5).
- No end-to-end test proves the trial cap or expiry through the real UI.

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

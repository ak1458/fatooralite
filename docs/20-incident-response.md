# Incident response — Fatoora Lite Pro

Phase 4 / W23 (A-084…A-097, A-335). Every revocation *mechanism* named here
already exists and is tested; this document is the missing piece — the
written procedure that connects them. Nothing below invents a new mechanism.

Where a step needs the owner (Vercel console, Neon console, the Fatoora
portal, legal review) it says so explicitly — this runbook does not pretend
those steps can be automated away.

---

## 1. Roles and severity

**Honest reality: one responder.** This is a single-operator project; the
owner is the incident responder. There is no on-call rotation, no separate
security team to escalate to. Every step below assumes the owner is the one
running it.

Severity, in order (most severe first):

1. **Tenant data exposure** — one company's invoices, VAT numbers, or ZATCA
   credentials became visible to another tenant or to the public.
2. **Credential compromise** — a session token, `AUTH_SECRET`,
   `OPERATOR_SECRET`, `CRON_SECRET`, an AI provider key, a ZATCA certificate
   private key, or the Moyasar secret is suspected leaked.
3. **Availability** — the app or a critical path (login, invoice issuance,
   ZATCA submission) is down or degraded.

Data exposure outranks credential compromise, which outranks availability:
a company's tax records leaking is worse than the site being briefly down.

## 2. Detection and triage

**Sources, in the order to check them:**

1. **`GET /api/security-events?companyId=…&action=…&outcome=…`** — the query
   API over the `SecurityEvent` log (`lib/audit/events.ts`). Every action is
   one of the `SECURITY_EVENTS` constants: `auth.login.failure`,
   `authz.permission.denied`, `authz.tenant.mismatch`,
   `authz.session.rejected`, `certificate.issued`, `certificate.replaced`,
   `user.role.changed`, `billing.plan.changed`, `ai.index.rebuilt`,
   `zatca.submission.retried`, `zatca.submission.exhausted`, and others in
   that file. Filter by `outcome=denied` or `outcome=failure` first for a
   suspected attack; by `action` for a specific mechanism (e.g. every
   `authz.tenant.mismatch` row is a cross-tenant attempt that was refused).
2. **`x-request-id` correlation.** Every response carries this header
   (minted server-side in `proxy.ts`, never trusted from the client — see
   `START-HERE.md`'s invariant). If a customer reports a problem, ask for the
   ID off their response/error toast and grep the structured JSON logs
   (`lib/log/logger.ts`) for it — this ties one customer's specific report to
   the exact request, with no shared/leaked identifier risk.
3. **`GET /api/health/deep`** — current DB connectivity, job stats
   (`lib/services/job-stats.ts`), and gateway reachability. Check this first
   for an availability incident, before assuming a security cause.
4. **Vercel's own logs/dashboard** — deployment status, function errors,
   build failures. Owner-verify: this runbook does not assume what retention
   or alerting Vercel's plan provides.

**"Identify affected customers"** (A-092) means: `SecurityEvent` queries
scoped by `action`/`outcome`/time window, cross-referenced against
`companyId`. There is no separate customer-impact tracking system — the
event log is the source of truth.

**"Identify affected versions"** (A-093) does not apply the way it would to
shipped client software: this is a single-version hosted SaaS. Every tenant
runs whatever is currently deployed to `https://fatooralite.vercel.app`.
"Affected versions" reduces to "which deploy(s) were live during the
incident window" — `vercel ls` / the Vercel dashboard's deployment history
answers that.

## 3. Revocation playbooks (A-084…A-089)

Each of these is a real, already-built mechanism. This section is the
missing "when do I use which one, and how."

### 3a. Revoke one user's sessions

```sql
UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = '<userId>';
```

Every outstanding JWT for that user embeds the old `sessionVersion`;
`hasCurrentSessionVersion` (`lib/auth/server.ts`) rejects it on the next
request, and (Phase 4 / W19) a session past the refresh window that's
already been revoked is never extended — revocation strictly dominates
refresh, checked *before* any refresh logic runs.

**Per-device logout is not possible.** The JWT carries no per-session id
(deliberate — see `START-HERE.md`'s invariant), so this revokes *every*
device for that user, not just the suspect one. For software holding a
business's tax records, that is the accepted trade-off, not a gap to close
here.

### 3b. Revoke every session, all tenants

Same statement with no `WHERE`:

```sql
UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1;
```

Use only for a suspected `AUTH_SECRET` compromise or a cross-tenant incident
whose blast radius isn't yet bounded to one user. This logs out every
signed-in user on every device — expect support volume afterward.

### 3c. Global session kill via secret rotation

If the JWT signing key itself may be compromised (not just one row's
version), rotating `AUTH_SECRET` invalidates *every* token immediately,
without touching the database:

1. Generate a new strong value (do not reuse the 2026-08-06 rotation value
   or any prior one).
2. Set it in Vercel's environment variables (owner action — Vercel console
   or `vercel env`).
3. Redeploy (`cd fatooralite && npx vercel --prod`) so the new function
   instances pick it up.

This is the exact precedent from the 2026-08-06 `AUTH_SECRET` rotation
(`START-HERE.md`'s "Previous state" section) — it is safe and has already
been done once in this project's history.

### 3d. Rotate other secrets

| Secret | Where it's set | What breaks if you rotate it |
|---|---|---|
| `OPERATOR_SECRET` | Vercel env | Global AI re-index (`POST /api/ai/ingest {scope:"global"}`) becomes unreachable until updated everywhere it's used — there is deliberately no platform-admin role, so this is the only holder |
| `CRON_SECRET` | Vercel env | `/api/cron/*` routes reject the old value; update Vercel Cron's configured header too |
| AI provider keys (`GROQ_API_KEY`, `OPENAI_API_KEY`, `VOYAGE_API_KEY`) | Vercel env, provider console | AI chat/embeddings stop working until the new key is set — rotate at the provider first, then Vercel |
| Moyasar secret | Vercel env, Moyasar dashboard | Checkout/webhook verification fails until both sides agree |

None of these need a redeploy by themselves in most cases (Vercel env vars
are read at request time for serverless functions), but redeploy anyway to
be certain, and to pick up `AUTH_SECRET` if rotating that at the same time.

### 3e. ZATCA certificate revocation

Set the row's status so the app stops signing with it:

```sql
UPDATE "Certificate" SET status = 'revoked' WHERE id = '<certificateId>';
```

`getActiveCertificate` (`lib/db/repo.ts`) only selects `status = 'active'`,
so this immediately stops new issuance from using the compromised key. The
tenant must then re-onboard with a new certificate.

**Revoking the actual production CSID at ZATCA's Fatoora portal is a
separate, owner-only action** (the same OTP/portal access gated behind
**X1**) — this database update stops *this app* from using the key; it does
not itself tell ZATCA anything. Treat the two as independent steps, and
don't report the incident closed until both are done if the certificate's
private key is the thing that leaked.

### 3f. `ENCRYPTION_KEY` — explicitly NOT a break-glass rotation

`ENCRYPTION_KEY` **must never be rotated independently of the database it's
paired with** (`START-HERE.md` invariant) — every stored `Certificate`
private key is only decryptable with the exact key that encrypted it.
Rotating it without first re-encrypting every `Certificate` row makes every
tenant's ZATCA signing key permanently unrecoverable — worse than the
incident it was meant to respond to.

If `ENCRYPTION_KEY` itself is suspected compromised, the only safe path is a
**written re-encryption migration** (decrypt every `Certificate.privateKey`/
`secret` with the old key, re-encrypt with a new one, in one transaction,
verified against a restore-drill copy first). That is engineering work to
plan and execute deliberately — not a runbook one-liner, and not attempted
as an improvised incident response step.

### 3g. Tenant disable

**There is no lockout action, by design.** A `Subscription` set to expired
is read-only, not locked out (`START-HERE.md` invariant) — a tenant can
still view/download/export their own filed documents. If a specific tenant
needs to be cut off (e.g. a compromised account actively being abused),
the available lever is session revocation (§3a) plus, if genuinely
necessary, a direct `Subscription.status` change — but that changes billing
state, not a security boundary, and should not be reached for as the first
response to a security incident.

## 4. Emergency / mandatory updates (A-094, A-095)

Cross-reference `docs/19-operations-runbook.md` §5 (Emergency patching) for
the deploy mechanics. On the "mandatory update" question specifically:
**every deploy is mandatory for every user**, because this is a hosted SaaS
with one deployed version and no client-side version pinning — there is no
concept of a user "staying on an old version." That is the honest closure of
A-095; there is no separate update-enforcement mechanism to build because
the deployment model already enforces it.

## 5. Incident recording (A-090)

Record every incident that reaches severity 1 or 2 (§1), and any severity-3
incident lasting over 15 minutes, in `docs/incidents/`, one file per
incident, named `YYYY-MM-DD-short-slug.md`, using this template:

```markdown
# Incident: <short title>

- **Detected:** <timestamp, how it was found — SecurityEvent query / customer report / health check>
- **Severity:** <1/2/3, per §1>
- **Scope:** <which tenant(s)/companyId(s), from SecurityEvent queries>
- **Actions taken:** <which §3 playbook(s), in order, with timestamps>
- **Root cause:** <what actually happened — don't record a guess as a finding>
- **Follow-ups:** <what changes as a result — code, process, or "none">
```

No fabricated example incident is included in this document or in
`docs/incidents/` — the folder starts with only a `README.md` pointing back
here.

## 6. Log retention (A-091)

`SecurityEvent` rows are **never purged** by any code in this app —
deliberate (`START-HERE.md` invariant: "safer to keep too much than to
delete early"). Retention policy (how long to actually keep them, and any
legal minimum/maximum under Saudi PDPL) is an **open decision** — see
`docs/audit/decision-register.md`. This runbook does not resolve that
decision; it only records that the technical capacity to retain indefinitely
already exists.

Vercel's own log retention (for structured JSON logs, separate from
`SecurityEvent`) depends on the Vercel plan — **owner-verify**, not asserted
here.

## 7. Customer notification (A-097)

Trigger criteria: any severity-1 incident (tenant data exposure) where a
specific tenant's data was actually reachable by another party — not merely
"a vulnerability existed," but "the SecurityEvent log or other evidence
shows it was exercised."

Template:

```
Subject: Security notice — Fatoora Lite Pro

We detected <what>, affecting <scope>, on <date>. <What we did.> <What you
should do, if anything — e.g. "no action needed" or "please rotate your
password.">
```

**Whether Saudi PDPL creates a legal notification *obligation*, and within
what timeframe, is a question for qualified legal counsel — REQUIRES
OWNER/LEGAL REVIEW.** This document does not assert a legal duty; it only
provides the mechanical template for when the owner (with legal input)
decides notification is warranted. This sits alongside **D4** (legal copy)
in the decision register without resolving it.

---

## Appendix: quick reference table

| Symptom | First check | Likely playbook |
|---|---|---|
| Customer reports seeing another company's data | `authz.tenant.mismatch` events for that window | §3a or §3b depending on scope found |
| Suspected stolen session cookie | `authz.session.rejected` / `auth.login.success` from an unfamiliar IP | §3a |
| Suspected `AUTH_SECRET` leak (e.g. committed to a public repo) | N/A — treat as confirmed | §3c |
| Suspected leaked ZATCA private key | `certificate.issued`/`certificate.replaced` history | §3e (both DB status AND portal, X1) |
| Repeated login failures against one account | `auth.login.failure` count for that email/IP | rate limiter should already be engaging; confirm via `/api/health/deep`, no manual action needed unless it's bypassing the limiter |
| Site down / 5xx spike | `/api/health/deep`, Vercel deployment status | availability incident, not security — check recent deploys first |


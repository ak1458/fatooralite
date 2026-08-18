# Security event log — operations guide

Added by remediation **W2** (audit items M-037, M-507, A-034, A-044). Closes the
audit finding that the product could not answer *"who did what, when"* for
anything except invoice artifacts.

---

## What it is

`SecurityEvent` is a append-only record of security-relevant and administrative
actions. It is deliberately **separate from `AuditEntry`**: that table stores
invoice documents (XML, signed XML, QR, gateway response) keyed to an invoice
and has no actor, tenant or outcome. Folding security events into it would
conflate a document archive with a security log and leave both hard to query.

| Column | Purpose |
|---|---|
| `companyId` | Tenant the event belongs to. **Null** when there is none — e.g. a failed login for an address matching no account |
| `actorId` / `actorEmail` | Who did it. The email is denormalised so the row stays readable after the user is deleted |
| `action` | Dotted name, e.g. `auth.login.failure` |
| `outcome` | `success` \| `failure` \| `denied` |
| `targetType` / `targetId` | What was acted on |
| `ip` / `userAgent` | Caller identity, IP resolved the same way the rate limiter resolves it (rightmost trusted hop) |
| `metadata` | Small non-secret JSON, always passed through `redact()` |

**No foreign keys on `companyId` or `actorId`, on purpose.** An audit record must
outlive what it describes: the record of a user being deleted cannot be cascaded
away by that deletion, and the record of a tenant teardown is exactly what an
investigation needs afterwards.

## Events recorded

| Area | Actions |
|---|---|
| Authentication | `auth.login.success`, `auth.login.failure`, `auth.logout`, `auth.password_reset.requested`, `auth.password_reset.completed` |
| Authorization | `authz.permission.denied`, `authz.tenant.mismatch`, `authz.session.rejected` |
| Users & roles | `user.created`, `user.updated`, `user.role.changed`, `user.deleted`, `role.created`, `role.updated`, `role.deleted` |
| Certificates | `certificate.issued`, `certificate.replaced` |
| Licence | `billing.plan.changed`, `billing.trial.started` |
| Other | `company.updated`, `ai.index.rebuilt` |

`authz.tenant.mismatch` records the tenant that was reached for, in
`metadata.attemptedCompanyId` — without it the log would say someone was refused
but not what they were trying to reach. `user.role.changed` records `from` and
`to`, so a privilege grant is visible as such rather than as a generic update.

## Reading it

```
GET /api/security-events?companyId=…&action=…&outcome=…&actorId=…&from=…&to=…&limit=…&cursor=…
```

Requires `audit:view` and is tenant-scoped through `requirePermission`, exactly
like the invoice audit vault. Two consequences worth stating plainly:

- A tenant can only ever read its own events (verified: cross-tenant read → 403).
- Events with a null `companyId` are unreachable through this endpoint. That is
  what stops the log confirming whether an email address has an account.

## Two rules the implementation enforces

1. **Recording never breaks the action it describes.** Every write is wrapped;
   a failure is logged to the console and swallowed. An audit trail that can
   take down login is worse than no audit trail. Covered by a test that injects
   a failing client and asserts the call still resolves.
2. **Secrets are never stored.** `redact()` drops any key matching
   `pass|secret|token|key|cookie|authorization|credential|otp|nonce|hash|signature`
   and replaces it with `[redacted]`, rather than trusting each call site to
   remember. Covered by tests asserting the secret *value* never appears in the
   serialised metadata.

## Retention — decision required

The table grows without bound and nothing in application code deletes from it.
Indexes exist on `(companyId, createdAt)`, `(actorId, createdAt)`,
`(action, createdAt)` and `(createdAt)`; the last one is there specifically so an
age-based purge stays cheap.

**Not yet decided, and deliberately not decided here:**

- **Retention window.** 24 months is a common default for security logs. Longer
  windows help investigations; shorter ones reduce the amount of personal data
  held.
- **Interaction with a tenant's data-deletion request.** Saudi PDPL gives data
  subjects deletion rights, while security logs are normally retained as a
  legitimate interest. Which of these rows are erased on a deletion request and
  which are retained is a **legal question**, not an engineering one. It is
  recorded in `decision-register.md` and must be answered before the first
  deletion request, not during one.

Until that decision is made, nothing purges. That is the safe default: it is
possible to delete later, impossible to recover what was deleted early.

## Follow-on work (not in W2)

- No UI surfaces this yet — the API is the read surface. A settings screen
  belongs with N1/N9.
- Alerting on `auth.login.failure` bursts and on `authz.tenant.mismatch` belongs
  with **W4 (observability)**; the events now exist to alert on.
- A scheduled purge job belongs with **W8 (background job substrate)**, once the
  retention window is decided.

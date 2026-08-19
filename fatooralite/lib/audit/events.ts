import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { clientIpFor } from "@/lib/ratelimit/client-ip";
import { SENSITIVE_KEY } from "@/lib/log/redact";

/**
 * Security and administrative event recording.
 *
 * The audit found that `AuditEntry` only ever held invoice artifacts, so the
 * product could not answer "who did what, when" for anything else: not a failed
 * login, not a permission denial, not a role change, not certificate issuance.
 * For compliance software that is a real gap, and this closes it.
 *
 * Two rules shape everything here:
 *
 *  1. **Recording must never break the request it describes.** Every write is
 *     wrapped; a logging failure is logged and swallowed. An audit trail that
 *     can take down login is worse than no audit trail.
 *  2. **Never record a secret.** No passwords, tokens, CSID secrets, private
 *     keys or session cookies — not in `metadata`, not anywhere. `redact()`
 *     below is the only sanctioned way to build metadata, and it drops keys that
 *     look sensitive rather than trusting each call site to remember.
 */

/** Every event this application records. Dotted, past-tense, stable strings. */
export const SECURITY_EVENTS = {
  loginSuccess: "auth.login.success",
  loginFailure: "auth.login.failure",
  logout: "auth.logout",
  passwordResetRequested: "auth.password_reset.requested",
  passwordResetCompleted: "auth.password_reset.completed",
  permissionDenied: "authz.permission.denied",
  tenantMismatch: "authz.tenant.mismatch",
  sessionRejected: "authz.session.rejected",
  userCreated: "user.created",
  userUpdated: "user.updated",
  userRoleChanged: "user.role.changed",
  userDeleted: "user.deleted",
  roleCreated: "role.created",
  roleUpdated: "role.updated",
  roleDeleted: "role.deleted",
  certificateIssued: "certificate.issued",
  certificateReplaced: "certificate.replaced",
  companyUpdated: "company.updated",
  planChanged: "billing.plan.changed",
  trialStarted: "billing.trial.started",
  aiIndexRebuilt: "ai.index.rebuilt",
  zatcaSubmissionRetried: "zatca.submission.retried",
  zatcaSubmissionExhausted: "zatca.submission.exhausted",
  invoiceEmailSent: "invoice.email_sent",
  invoiceWhatsappSent: "invoice.whatsapp_sent",
  featureFlagChanged: "feature_flag.changed",
  operatorCompaniesViewed: "operator.companies.viewed",
  operatorWhatsappSessionViewed: "operator.whatsapp_session.viewed",
  operatorAccessDenied: "operator.access.denied",
} as const;

export type SecurityEventName = (typeof SECURITY_EVENTS)[keyof typeof SECURITY_EVENTS];
export type SecurityOutcome = "success" | "failure" | "denied";

export interface SecurityEventInput {
  action: SecurityEventName;
  outcome: SecurityOutcome;
  companyId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  targetType?: "user" | "role" | "certificate" | "subscription" | "company" | "ai" | "invoice" | null;
  targetId?: string | null;
  /** Small, non-secret facts. Passed through `redact()` before storage. */
  metadata?: Record<string, unknown> | null;
  /** Incoming request, when there is one — supplies IP and user agent. */
  request?: Request | null;
}

/** Drop sensitive keys and clamp value sizes. Never throws. */
export function redact(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(k)) {
      safe[k] = "[redacted]";
      continue;
    }
    if (v === null || v === undefined) continue;
    if (typeof v === "string") safe[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean") safe[k] = v;
    else safe[k] = String(v).slice(0, 200);
  }
  try {
    return JSON.stringify(safe);
  } catch {
    return null;
  }
}

/**
 * Write one security event.
 *
 * Awaited by callers that need ordering guarantees (tests, and anything that
 * reads the log immediately afterwards); safe to leave un-awaited otherwise —
 * it never rejects.
 */
export async function recordSecurityEvent(
  input: SecurityEventInput,
  db: PrismaClient = defaultDb,
): Promise<void> {
  try {
    await db.securityEvent.create({
      data: {
        action: input.action,
        outcome: input.outcome,
        companyId: input.companyId ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ? input.actorEmail.toLowerCase() : null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ip: input.request ? clientIpFor(input.request.headers) : null,
        userAgent: input.request?.headers.get("user-agent")?.slice(0, 300) ?? null,
        metadata: redact(input.metadata),
      },
    });
  } catch (err) {
    // Never let the audit trail break the action it is describing.
    console.error("securityEvent: failed to record", input.action, err);
  }
}

export interface SecurityEventQuery {
  companyId: string;
  action?: string;
  outcome?: SecurityOutcome;
  actorId?: string;
  /** ISO date-time lower bound, inclusive. */
  from?: Date;
  /** ISO date-time upper bound, exclusive. */
  to?: Date;
  limit?: number;
  cursor?: string;
}

/**
 * Read a tenant's security events, newest first.
 *
 * Always scoped to one company. Events with a null companyId — a failed login
 * for an address matching no account, for instance — belong to no tenant and
 * are deliberately unreachable through this path.
 */
export async function querySecurityEvents(q: SecurityEventQuery, db: PrismaClient = defaultDb) {
  const take = Math.min(Math.max(q.limit ?? 50, 1), 200);
  return db.securityEvent.findMany({
    where: {
      companyId: q.companyId,
      ...(q.action ? { action: q.action } : {}),
      ...(q.outcome ? { outcome: q.outcome } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.from || q.to
        ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: q.to } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
}

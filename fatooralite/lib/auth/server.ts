import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import type { SessionPayload } from "./session";
import { can } from "./rbac";
import type { Permission } from "./rbac";
import { prisma } from "@/lib/db/client";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

/** Read the current session in a Server Component / Route Handler (cookie store). */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Read the session from an incoming Request's cookies (API handlers). */
export async function getUserFromRequest(req: Request): Promise<SessionPayload | null> {
  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}

/**
 * Whether the user holds a permission — via their system role (code matrix)
 * or, failing that, a DB-backed custom role (User.roleId -> RolePermission).
 * `db` is injectable (defaults to the real client) for testability.
 */
export async function hasPermission(user: SessionPayload, permission: Permission, db: PrismaClient = prisma): Promise<boolean> {
  if (can(user.role, permission)) return true;
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { roleId: true },
  });
  if (!dbUser?.roleId) return false;
  const grant = await db.rolePermission.findUnique({
    where: { roleId_permission: { roleId: dbUser.roleId, permission } },
  });
  return !!grant;
}

/** All permissions a user effectively holds (system matrix + custom role). */
export async function effectivePermissions(user: SessionPayload, db: PrismaClient = prisma): Promise<Set<string>> {
  const perms = new Set<string>();
  const { MATRIX_LOOKUP } = await import("./rbac");
  for (const p of MATRIX_LOOKUP(user.role)) perms.add(p);
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { roleId: true },
  });
  if (dbUser?.roleId) {
    const grants = await db.rolePermission.findMany({
      where: { roleId: dbUser.roleId },
      select: { permission: true },
    });
    for (const g of grants) perms.add(g.permission);
  }
  return perms;
}

/**
 * Whether the JWT's embedded sessionVersion still matches the DB. A password
 * reset increments User.sessionVersion, which must invalidate every token
 * issued before the reset — otherwise a stolen session survives its full
 * 7-day life even after the legitimate user "secures" their account.
 * Fails closed: a missing/deleted user counts as invalid. `db` is injectable
 * (defaults to the real client) so this is testable against a test database,
 * matching the convention in lib/db/repo.ts and lib/billing/plan.ts.
 */
export async function hasCurrentSessionVersion(user: SessionPayload, db: PrismaClient = prisma): Promise<boolean> {
  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { sessionVersion: true },
  });
  return dbUser !== null && dbUser.sessionVersion === user.sessionVersion;
}

/**
 * Whether `user` may act as `companyId` (undefined/null companyId means "no
 * assertion", always allowed). Deny-by-default: a company-less session
 * (User.companyId is nullable — reachable, not hypothetical) must NOT bypass
 * this just because there's nothing to compare against. A prior truthy-guard
 * version of this check (`companyId && user.companyId && ...`) short-
 * circuited to "allow" for exactly that case; every caller of this helper
 * replaces one of those copies.
 */
export function isCallerCompany(user: SessionPayload | null, companyId?: string | null): boolean {
  return !companyId || user?.companyId === companyId;
}

/**
 * Guard a route handler: returns the user, or a 401/403 NextResponse to return
 * early. Secure by default — enforcement is ON unless AUTH_ENFORCE is
 * explicitly "false" (unauthenticated local demos only). This MUST match
 * proxy.ts's page-level gate exactly: if the two ever disagree on the
 * default, page routes can appear protected (redirecting to /login) while
 * the underlying API routes stay wide open to a direct call, which is worse
 * than no protection at all because it looks secure.
 */
export async function requirePermission(
  req: Request,
  permission: Permission,
  targetCompanyId?: string,
): Promise<{ user: SessionPayload | null; deny?: NextResponse }> {
  if (process.env.AUTH_ENFORCE === "false") {
    return { user: await getUserFromRequest(req) };
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return { user: null, deny: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  // Denials are recorded, not just returned. A permission denial and — far more
  // importantly — a cross-tenant attempt are the two signals that say someone is
  // probing this system, and neither left any trace before the security event
  // log existed. Recording is best-effort and never blocks the denial.
  if (!(await hasCurrentSessionVersion(user))) {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.sessionRejected,
      outcome: "denied",
      companyId: user.companyId,
      actorId: user.userId,
      actorEmail: user.email,
      request: req,
      metadata: { permission },
    });
    return { user: null, deny: NextResponse.json({ error: "Session no longer valid. Please sign in again." }, { status: 401 }) };
  }
  if (!(await hasPermission(user, permission))) {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.permissionDenied,
      outcome: "denied",
      companyId: user.companyId,
      actorId: user.userId,
      actorEmail: user.email,
      request: req,
      metadata: { permission, role: user.role },
    });
    return { user, deny: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  if (!isCallerCompany(user, targetCompanyId)) {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.tenantMismatch,
      outcome: "denied",
      companyId: user.companyId,
      actorId: user.userId,
      actorEmail: user.email,
      request: req,
      // The tenant that was reached for is recorded: without it the log says
      // someone was refused but not what they were trying to reach.
      metadata: { permission, attemptedCompanyId: targetCompanyId },
    });
    return { user, deny: NextResponse.json({ error: "Tenant mismatch. Access denied to this company's resources." }, { status: 403 }) };
  }
  return { user };
}

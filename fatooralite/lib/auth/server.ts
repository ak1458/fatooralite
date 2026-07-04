import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import type { SessionPayload } from "./session";
import { can } from "./rbac";
import type { Permission } from "./rbac";
import { prisma } from "@/lib/db/client";

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
 */
export async function hasPermission(user: SessionPayload, permission: Permission): Promise<boolean> {
  if (can(user.role, permission)) return true;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { roleId: true },
  });
  if (!dbUser?.roleId) return false;
  const grant = await prisma.rolePermission.findUnique({
    where: { roleId_permission: { roleId: dbUser.roleId, permission } },
  });
  return !!grant;
}

/** All permissions a user effectively holds (system matrix + custom role). */
export async function effectivePermissions(user: SessionPayload): Promise<Set<string>> {
  const perms = new Set<string>();
  const { MATRIX_LOOKUP } = await import("./rbac");
  for (const p of MATRIX_LOOKUP(user.role)) perms.add(p);
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { roleId: true },
  });
  if (dbUser?.roleId) {
    const grants = await prisma.rolePermission.findMany({
      where: { roleId: dbUser.roleId },
      select: { permission: true },
    });
    for (const g of grants) perms.add(g.permission);
  }
  return perms;
}

/**
 * Guard a route handler: returns the user, or a 401/403 NextResponse to return
 * early. Auth enforcement is gated by AUTH_ENFORCE so the demo runs open by
 * default; set AUTH_ENFORCE=true to require login + permissions.
 */
export async function requirePermission(
  req: Request,
  permission: Permission,
  targetCompanyId?: string,
): Promise<{ user: SessionPayload | null; deny?: NextResponse }> {
  if (process.env.AUTH_ENFORCE !== "true") {
    return { user: await getUserFromRequest(req) };
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return { user: null, deny: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!(await hasPermission(user, permission))) {
    return { user, deny: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  if (targetCompanyId && user.companyId && user.companyId !== targetCompanyId) {
    return { user, deny: NextResponse.json({ error: "Tenant mismatch. Access denied to this company's resources." }, { status: 403 }) };
  }
  return { user };
}

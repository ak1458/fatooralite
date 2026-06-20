import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import type { SessionPayload } from "./session";
import { can } from "./rbac";
import type { Permission } from "./rbac";

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
 * Guard a route handler: returns the user, or a 401/403 NextResponse to return
 * early. Auth enforcement is gated by AUTH_ENFORCE so the demo runs open by
 * default; set AUTH_ENFORCE=true to require login + permissions.
 */
export async function requirePermission(
  req: Request,
  permission: Permission,
): Promise<{ user: SessionPayload | null; deny?: NextResponse }> {
  if (process.env.AUTH_ENFORCE !== "true") {
    return { user: await getUserFromRequest(req) };
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return { user: null, deny: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!can(user.role, permission)) {
    return { user, deny: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  return { user };
}

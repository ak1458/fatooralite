import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getUserFromRequest } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout — revoke the session server-side, then clear the cookie.
 *
 * Clearing the cookie alone is not a logout. The session is a stateless 7-day
 * JWT, so a token captured before logout (shared machine, a copied cookie jar,
 * a proxy or backup that recorded the header) stayed valid for its full life no
 * matter how many times the user pressed "sign out". Bumping User.sessionVersion
 * is the revocation mechanism this schema already has — requirePermission()
 * compares the JWT's embedded version against the database on every protected
 * request, so the increment invalidates every outstanding token for this user
 * immediately.
 *
 * The trade-off is deliberate: because the JWT carries no per-session id, this
 * signs the user out of every device rather than just this one. For software
 * holding a business's tax records, "sign out means signed out everywhere" is
 * the safer default of the two.
 */
export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  // Always clear the cookie, even if the revocation below cannot run — a
  // failure to reach the database must not leave the browser signed in.
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });

  const user = await getUserFromRequest(req);
  if (!user) return res;

  try {
    await prisma.user.update({
      where: { id: user.userId },
      data: { sessionVersion: { increment: 1 } },
    });
    await recordSecurityEvent({
      action: SECURITY_EVENTS.logout,
      outcome: "success",
      companyId: user.companyId,
      actorId: user.userId,
      actorEmail: user.email,
      request: req,
    });
  } catch (err) {
    // A deleted user, or the database being briefly unreachable, must still
    // produce a successful logout for the browser.
    console.error("Logout: could not revoke session server-side:", err);
  }

  return res;
}

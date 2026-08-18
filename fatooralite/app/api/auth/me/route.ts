import { NextResponse } from "next/server";
import { getUserFromRequest, hasCurrentSessionVersion } from "@/lib/auth/server";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  SESSION_REFRESH_AFTER_SECONDS,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

/** GET /api/auth/me — current session user + their company's onboarding state. */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ user: null, company: null });

  // This route reads the session directly rather than through
  // requirePermission(), so it has to make the same revocation check that guard
  // makes. Without it a token revoked by logout or a password reset still
  // reported a signed-in user here — the client treats that as "you are logged
  // in" and renders the shell, even though every protected API call 401s.
  if (!(await hasCurrentSessionVersion(user))) {
    return NextResponse.json({ user: null, company: null });
  }

  const company = user.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          id: true,
          name: true,
          nameAr: true,
          vatNumber: true,
          onboardingStatus: true,
          onboardingStep: true,
        },
      })
    : null;

  const res = NextResponse.json({ user, company });

  // W19: sliding refresh. Runs strictly *after* the revocation check above —
  // a revoked session must never be extended, only a genuinely still-valid
  // one. Re-minted from a fresh DB read (not the old token's claims) so a
  // role/name change since issuance actually propagates, instead of being
  // frozen for the rest of the 7-day window. Best-effort: any failure here
  // must not turn a working session read into an error response.
  try {
    if (user.iat !== undefined && Date.now() / 1000 - user.iat > SESSION_REFRESH_AFTER_SECONDS) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, name: true, role: true, companyId: true, sessionVersion: true },
      });
      if (dbUser) {
        const refreshed = await createSessionToken({
          userId: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          companyId: dbUser.companyId ?? undefined,
          sessionVersion: dbUser.sessionVersion,
        });
        res.cookies.set(SESSION_COOKIE, refreshed, sessionCookieOptions());
      }
    }
  } catch {
    // Refresh is best-effort; the read above already succeeded and that's what matters.
  }

  return res;
}

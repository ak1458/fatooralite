import { NextResponse } from "next/server";
import { getUserFromRequest, hasCurrentSessionVersion } from "@/lib/auth/server";
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

  return NextResponse.json({ user, company });
}

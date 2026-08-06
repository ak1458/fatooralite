import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

/** GET /api/auth/me — current session user + their company's onboarding state. */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ user: null, company: null });

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

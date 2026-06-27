import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";

/**
 * GET /api/companies — the caller's own company only (tenant-scoped). Returns a
 * one-element list for back-compat with selector consumers. Never lists other
 * tenants. With auth disabled and no session, falls back to all companies so the
 * local demo still works.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);

  if (user?.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { id: true, name: true, nameAr: true, vatNumber: true },
    });
    return NextResponse.json({ companies: company ? [company] : [] });
  }

  // No session: only expose companies when auth enforcement is off (local demo).
  if (process.env.AUTH_ENFORCE === "true") {
    return NextResponse.json({ companies: [] });
  }
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, nameAr: true, vatNumber: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ companies });
}

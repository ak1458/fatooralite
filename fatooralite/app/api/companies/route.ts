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

  // No session: only expose companies when auth enforcement is explicitly off
  // (local demo). Secure by default — must match proxy.ts/requirePermission's
  // "enforced unless AUTH_ENFORCE=false" default, or this becomes the one
  // route that quietly stays open when everything else is locked down.
  if (process.env.AUTH_ENFORCE !== "false") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, nameAr: true, vatNumber: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ companies });
}

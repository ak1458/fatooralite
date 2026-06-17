import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

/** GET /api/companies — list companies (id, name, vat) for selectors. */
export async function GET() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, nameAr: true, vatNumber: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ companies });
}

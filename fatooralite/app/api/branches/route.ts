import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

const createBranchSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Branch name is required").max(100),
  nameAr: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
});

/** GET /api/branches?companyId — list a company's branches (locations). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const branches = await prisma.branch.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ branches });
}

/** POST /api/branches — create a branch (location) for a company. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { deny } = await requirePermission(req, "settings:manage", parsed.data.companyId);
  if (deny) return deny;

  const branch = await prisma.branch.create({ data: parsed.data });
  return NextResponse.json({ branch }, { status: 201 });
}

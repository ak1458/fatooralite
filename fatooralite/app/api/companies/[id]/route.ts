import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { updateCompanySchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

const patchCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().max(100).nullable().optional(),
  crNumber: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  onboardingStatus: z.enum(["pending", "in_progress", "complete"]).optional(),
  onboardingStep: z.number().int().min(0).max(10).optional(),
});

/** PATCH /api/companies/[id] — partial update (profile fields + onboarding progress). */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny } = await requirePermission(req, "settings:manage", params.id);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const company = await prisma.company.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(company);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny } = await requirePermission(req, "settings:manage", params.id);
  if (deny) return deny;

  const company = await prisma.company.findUnique({
    where: { id: params.id },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny } = await requirePermission(req, "settings:manage", params.id);
  if (deny) return deny;

  try {
    const body = await req.json();
    const data = updateCompanySchema.parse(body);
    
    const company = await prisma.company.update({
      where: { id: params.id },
      data,
    });
    
    return NextResponse.json(company);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

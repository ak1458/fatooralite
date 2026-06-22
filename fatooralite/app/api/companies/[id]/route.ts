import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { updateCompanySchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

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

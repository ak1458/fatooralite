import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createProductSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";
import { num } from "@/lib/db/decimal";
import { scheduleCompanyIngest } from "@/lib/ai/tenant-ingest";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "invoice:create", companyId);
  if (deny) return deny;

  const products = (
    await prisma.product.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    })
  ).map((p) => ({ ...p, unitPrice: num(p.unitPrice) }));
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, ...rest } = body;
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const { deny } = await requirePermission(req, "invoice:create", companyId);
    if (deny) return deny;
    
    const data = createProductSchema.parse(rest);

    const product = await prisma.product.create({
      data: {
        companyId,
        ...data,
      },
    });
    scheduleCompanyIngest(companyId);
    return NextResponse.json({ ...product, unitPrice: num(product.unitPrice) }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

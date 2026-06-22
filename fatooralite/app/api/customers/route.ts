import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createCustomerSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "invoice:create", companyId);
  if (deny) return deny;

  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, ...rest } = body;
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const { deny } = await requirePermission(req, "invoice:create", companyId);
    if (deny) return deny;
    
    const data = createCustomerSchema.parse(rest);

    const customer = await prisma.customer.create({
      data: {
        companyId,
        ...data,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

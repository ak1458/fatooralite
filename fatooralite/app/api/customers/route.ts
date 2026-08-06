import { NextResponse } from "next/server";
import { zodErrorResponse } from "@/lib/validation/http";
import { prisma } from "@/lib/db/client";
import { createCustomerSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";
import { scheduleCompanyIngest } from "@/lib/ai/tenant-ingest";

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
    take: 50,
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
    scheduleCompanyIngest(companyId);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    const invalid = zodErrorResponse(error);
    if (invalid) return invalid;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

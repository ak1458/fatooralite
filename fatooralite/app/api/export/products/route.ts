import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";
import { csvRow } from "@/lib/csv/format";
import { num } from "@/lib/db/decimal";

export const runtime = "nodejs";

const HEADERS = ["name", "sku", "unitPrice", "vatCategory"] as const;

/** GET /api/export/products?companyId= — same "your own data, a read path" reasoning as /api/export/customers. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "invoice:export", companyId);
  if (deny) return deny;

  const products = await prisma.product.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } });
  const lines = [
    csvRow(HEADERS as unknown as string[]),
    ...products.map((p) => csvRow([p.name, p.sku ?? "", num(p.unitPrice), p.vatCategory])),
  ];

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products.csv"`,
    },
  });
}

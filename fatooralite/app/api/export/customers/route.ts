import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";
import { csvRow } from "@/lib/csv/format";

export const runtime = "nodejs";

const HEADERS = ["name", "nameAr", "vatNumber", "crNumber", "address", "city", "phone", "email"] as const;

/**
 * GET /api/export/customers?companyId= — a tenant's own data, out. Not
 * plan-gated and not flag-gated: exporting your own records is a read path,
 * same class as PDF download (the "expired trial is read-only, not locked
 * out" invariant) — gating "leave with your data" would be exactly the
 * liability that invariant exists to avoid.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "invoice:export", companyId);
  if (deny) return deny;

  const customers = await prisma.customer.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } });
  const lines = [
    csvRow(HEADERS as unknown as string[]),
    ...customers.map((c) => csvRow(HEADERS.map((h) => c[h as keyof typeof c] ?? ""))),
  ];

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers.csv"`,
    },
  });
}

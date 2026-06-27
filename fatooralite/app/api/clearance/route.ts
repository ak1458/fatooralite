import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";
import { computeClearanceStats } from "@/lib/services/clearance-stats";

export const runtime = "nodejs";

/** GET /api/clearance?companyId — real compliance aggregates + recent activity. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    select: {
      kind: true, status: true, vatAmount: true, grandTotal: true,
      issueDate: true, issueTime: true, resultCode: true,
      invoiceNumber: true, buyerName: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = computeClearanceStats(invoices);

  const feed = invoices.slice(0, 12).map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    buyer: inv.buyerName ?? "—",
    status: inv.status,
    kind: inv.kind,
    resultCode: inv.resultCode ?? null,
    amount: inv.grandTotal,
    time: inv.createdAt.toISOString(),
  }));

  return NextResponse.json({ stats, feed });
}

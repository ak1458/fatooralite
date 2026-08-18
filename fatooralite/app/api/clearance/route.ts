import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { num } from "@/lib/db/decimal";
import { requirePermission } from "@/lib/auth/server";
import { computeClearanceStats } from "@/lib/services/clearance-stats";
import { getSequenceIntegrity } from "@/lib/services/sequence-gaps";

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

  const stats = computeClearanceStats(
    invoices.map((i) => ({ ...i, vatAmount: num(i.vatAmount), grandTotal: num(i.grandTotal) })),
  );

  // Same correction as app/api/integration/route.ts: match on status, since a
  // locally-provisioned certificate has kind "local" and this query used to
  // miss it entirely, reporting "no certificate" for a tenant that was signing.
  const cert = await prisma.certificate.findFirst({
    where: { companyId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { serial: true, kind: true },
  });
  const isLocal = cert?.kind === "local" || cert?.serial === "LOCAL-DEV";

  const feed = invoices.slice(0, 12).map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    buyer: inv.buyerName ?? "—",
    status: inv.status,
    kind: inv.kind,
    resultCode: inv.resultCode ?? null,
    amount: num(inv.grandTotal),
    time: inv.createdAt.toISOString(),
  }));

  // W22 (A-030): a consumed chain slot with no invoice row behind it means a
  // record was lost, not a crash — issueInvoice() writes both in one transaction.
  const sequence = await getSequenceIntegrity(companyId);

  return NextResponse.json({ stats, feed, isLocal, sequence });
}

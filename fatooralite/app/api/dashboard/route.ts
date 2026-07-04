import { NextResponse } from "next/server";
import { getDashboardKpis, getDashboardFeed, getDashboardVolume, getDashboardIntegration } from "@/lib/db/queries";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  try {
    const [kpis, feed, volume, integration] = await Promise.all([
      getDashboardKpis(companyId),
      getDashboardFeed(companyId),
      getDashboardVolume(companyId),
      getDashboardIntegration(companyId),
    ]);

    return NextResponse.json({ kpis, feed, volume, integration });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


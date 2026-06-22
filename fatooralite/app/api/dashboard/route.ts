import { NextResponse } from "next/server";
import { getDashboardKpis, getDashboardFeed, getDashboardVolume } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const kpis = await getDashboardKpis(companyId);
    const feed = await getDashboardFeed(companyId);
    const volume = await getDashboardVolume(companyId);

    return NextResponse.json({ kpis, feed, volume });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

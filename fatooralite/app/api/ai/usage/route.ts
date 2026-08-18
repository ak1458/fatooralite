import { NextResponse } from "next/server";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";
import { monthlyUsageSummary } from "@/lib/ai/usage";

export const runtime = "nodejs";

/** GET /api/ai/usage — current-month AI usage for the caller's own company only. */
export async function GET(req: Request) {
  const { deny } = await requirePermission(req, "settings:manage");
  if (deny) return deny;

  const user = await getUserFromRequest(req);
  if (!user?.companyId) {
    return NextResponse.json({ error: "No active company" }, { status: 400 });
  }

  const routes = await monthlyUsageSummary(user.companyId);
  return NextResponse.json({ month: new Date().toISOString().slice(0, 7), routes });
}

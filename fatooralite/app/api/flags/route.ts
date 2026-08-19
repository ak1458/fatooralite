import { NextResponse } from "next/server";
import { getUserFromRequest, hasCurrentSessionVersion } from "@/lib/auth/server";
import { resolveFlags } from "@/lib/flags/flags";

export const runtime = "nodejs";

/**
 * GET /api/flags — resolved feature flags for the caller's own company only.
 * No parameters, by construction: there is no way to ask for another
 * tenant's flags through this route, so it carries no IDOR surface to guard.
 *
 * Reads the session directly (like GET /api/auth/me) rather than through
 * requirePermission — no single permission fits "any signed-in member of
 * this company," so it repeats the same revocation check that guard makes.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!(await hasCurrentSessionVersion(user))) {
    return NextResponse.json({ error: "Session no longer valid. Please sign in again." }, { status: 401 });
  }
  if (!user.companyId) return NextResponse.json({ flags: {} });

  const flags = await resolveFlags(user.companyId);
  return NextResponse.json({ flags });
}

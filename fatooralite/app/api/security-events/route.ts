import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { querySecurityEvents, SECURITY_EVENTS } from "@/lib/audit/events";

export const runtime = "nodejs";

/**
 * GET /api/security-events?companyId=…&action=…&outcome=…&actorId=…&from=…&to=…
 *
 * The read surface for the security event log. An audit trail nobody can query
 * is not an audit trail — it is storage — so this exists alongside the write
 * sites rather than after them.
 *
 * Tenant-scoped through requirePermission, exactly like the invoice audit vault.
 * Events with a null companyId (a failed login for an address matching no
 * account) belong to no tenant and are unreachable here by construction, which
 * is also what stops this endpoint confirming whether an address exists.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const parseDate = (v: string | null): Date | undefined => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const outcomeParam = url.searchParams.get("outcome");
  const outcome =
    outcomeParam === "success" || outcomeParam === "failure" || outcomeParam === "denied"
      ? outcomeParam
      : undefined;

  const events = await querySecurityEvents({
    companyId,
    action: url.searchParams.get("action") ?? undefined,
    outcome,
    actorId: url.searchParams.get("actorId") ?? undefined,
    from: parseDate(url.searchParams.get("from")),
    to: parseDate(url.searchParams.get("to")),
    limit: Number(url.searchParams.get("limit")) || undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      outcome: e.outcome,
      actorId: e.actorId,
      actorEmail: e.actorEmail,
      targetType: e.targetType,
      targetId: e.targetId,
      ip: e.ip,
      userAgent: e.userAgent,
      // Stored already redacted (lib/audit/events.ts). Returned as parsed JSON
      // so callers do not each re-implement the parse.
      metadata: e.metadata ? safeParse(e.metadata) : null,
      createdAt: e.createdAt,
    })),
    nextCursor: events.length > 0 ? events[events.length - 1].id : null,
    /** The vocabulary, so a client can build filters without hardcoding strings. */
    actions: Object.values(SECURITY_EVENTS),
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

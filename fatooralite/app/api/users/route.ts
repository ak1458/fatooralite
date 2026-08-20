import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { inviteUserSchema } from "@/lib/validation/schemas";
import { inviteUser, UserError } from "@/lib/services/user-service";
import { requirePermission } from "@/lib/auth/server";
import { checkSeatLimit } from "@/lib/billing/plan";
import { limitReached } from "@/lib/billing/deny";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import { loggerFor } from "@/lib/log/logger";

export const runtime = "nodejs";

/** GET /api/users?companyId — list the company's team members. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "users:manage", companyId);
  if (deny) return deny;

  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, role: true, roleId: true,
      customRole: { select: { name: true } },
      title: true, status: true, createdAt: true,
    },
  });
  return NextResponse.json({
    users: users.map((u) => ({ ...u, customRoleName: u.customRole?.name ?? null, customRole: undefined })),
  });
}

/** POST /api/users — invite/create a team member. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { companyId, ...rest } = (body ?? {}) as { companyId?: string };
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "users:manage", companyId);
  if (deny) return deny;

  const parsed = inviteUserSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const seatLimit = await checkSeatLimit(companyId);
  if (!seatLimit.allowed) return limitReached(seatLimit, "seats");

  try {
    const user = await inviteUser({ companyId, ...parsed.data });
    const { user: actor } = await requirePermission(req, "users:manage", companyId);
    await recordSecurityEvent({
      action: SECURITY_EVENTS.userCreated,
      outcome: "success",
      companyId,
      actorId: actor?.userId,
      actorEmail: actor?.email,
      targetType: "user",
      targetId: user.id,
      request: req,
      metadata: { email: user.email, role: user.role },
    });
    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role, title: user.title, status: user.status } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UserError) return NextResponse.json({ error: err.message }, { status: 409 });
    loggerFor(req).error("user.invite.failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}

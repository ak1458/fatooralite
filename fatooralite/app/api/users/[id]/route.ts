import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { updateUserSchema } from "@/lib/validation/schemas";
import { updateUser, removeUser, UserError } from "@/lib/services/user-service";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export const runtime = "nodejs";

async function authorizeForUser(req: Request, id: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { companyId: true, email: true, role: true },
  });
  if (!target) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const { deny } = await requirePermission(req, "users:manage", target.companyId ?? undefined);
  if (deny) return { error: deny };
  return { target };
}

/** PATCH /api/users/[id] — update role, title, or status. */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorizeForUser(req, id);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    const user = await updateUser(id, parsed.data);
    const actor = await getUserFromRequest(req);
    // A role change is recorded as its own event, with both the old and the new
    // role — "user.updated" alone would not tell an investigator that someone
    // was granted owner.
    const roleChanged = parsed.data.role !== undefined && parsed.data.role !== auth.target!.role;
    await recordSecurityEvent({
      action: roleChanged ? SECURITY_EVENTS.userRoleChanged : SECURITY_EVENTS.userUpdated,
      outcome: "success",
      companyId: auth.target!.companyId,
      actorId: actor?.userId,
      actorEmail: actor?.email,
      targetType: "user",
      targetId: id,
      request: req,
      metadata: roleChanged
        ? { targetEmail: auth.target!.email, from: auth.target!.role, to: user.role }
        : { targetEmail: auth.target!.email, status: user.status, title: user.title },
    });
    return NextResponse.json({ user: { id: user.id, role: user.role, title: user.title, status: user.status } });
  } catch (err) {
    if (err instanceof UserError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}

/** DELETE /api/users/[id] — remove a team member (cannot remove yourself). */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = await authorizeForUser(req, id);
  if (auth.error) return auth.error;

  const me = await getUserFromRequest(req);
  if (me?.userId === id) return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });

  await removeUser(id);
  await recordSecurityEvent({
    action: SECURITY_EVENTS.userDeleted,
    outcome: "success",
    companyId: auth.target!.companyId,
    actorId: me?.userId,
    actorEmail: me?.email,
    targetType: "user",
    targetId: id,
    request: req,
    metadata: { targetEmail: auth.target!.email, role: auth.target!.role },
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { updateUserSchema } from "@/lib/validation/schemas";
import { updateUser, removeUser, UserError } from "@/lib/services/user-service";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";

async function authorizeForUser(req: Request, id: string) {
  const target = await prisma.user.findUnique({ where: { id }, select: { companyId: true } });
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
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { isPermission } from "@/lib/auth/rbac";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";

const updateRoleSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(300).optional().nullable(),
  permissions: z.array(z.string()).min(1).optional(),
});

async function loadOwnedRole(req: Request, id: string) {
  const user = await getUserFromRequest(req);
  if (!user?.companyId) return { error: NextResponse.json({ error: "No active company" }, { status: 400 }) };
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role || role.companyId !== user.companyId) {
    return { error: NextResponse.json({ error: "Role not found" }, { status: 404 }) };
  }
  return { role };
}

/** PUT /api/roles/:id — rename / re-describe / replace permission set. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { deny } = await requirePermission(req, "users:manage");
  if (deny) return deny;
  const { id } = await ctx.params;

  const owned = await loadOwnedRole(req, id);
  if ("error" in owned) return owned.error;

  let parsed;
  try {
    parsed = updateRoleSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (parsed.permissions) {
    const invalid = parsed.permissions.filter((p) => !isPermission(p));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Unknown permissions: ${invalid.join(", ")}` }, { status: 400 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.permissions) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: parsed.permissions.map((permission) => ({ roleId: id, permission })),
      });
    }
    return tx.role.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      },
      include: { permissions: { select: { permission: true } } },
    });
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    permissions: updated.permissions.map((p) => p.permission),
  });
}

/** DELETE /api/roles/:id — remove a custom role (users fall back to system role). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { deny } = await requirePermission(req, "users:manage");
  if (deny) return deny;
  const { id } = await ctx.params;

  const owned = await loadOwnedRole(req, id);
  if ("error" in owned) return owned.error;

  await prisma.role.delete({ where: { id } }); // RolePermission cascades; User.roleId -> SetNull
  return NextResponse.json({ ok: true });
}

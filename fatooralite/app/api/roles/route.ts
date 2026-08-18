import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { roleMatrix, ALL_PERMISSIONS, isPermission } from "@/lib/auth/rbac";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export const runtime = "nodejs";

const createRoleSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional().nullable(),
  permissions: z.array(z.string()).min(1),
});

/**
 * GET /api/roles — system roles (code matrix) plus the company's custom roles
 * with their granted permissions, and the full permission list for the builder.
 */
export async function GET(req: Request) {
  const { deny } = await requirePermission(req, "users:manage");
  if (deny) return deny;

  const user = await getUserFromRequest(req);
  const customRoles = user?.companyId
    ? await prisma.role.findMany({
        where: { companyId: user.companyId },
        include: { permissions: { select: { permission: true } }, _count: { select: { users: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return NextResponse.json({
    roles: roleMatrix(),
    customRoles: customRoles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions.map((p) => p.permission),
      userCount: r._count.users,
    })),
    allPermissions: ALL_PERMISSIONS,
  });
}

/** POST /api/roles — create a custom role composed from permissions. */
export async function POST(req: Request) {
  const { deny } = await requirePermission(req, "users:manage");
  if (deny) return deny;

  const user = await getUserFromRequest(req);
  if (!user?.companyId) return NextResponse.json({ error: "No active company" }, { status: 400 });

  let parsed;
  try {
    parsed = createRoleSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const invalid = parsed.permissions.filter((p) => !isPermission(p));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Unknown permissions: ${invalid.join(", ")}` }, { status: 400 });
  }

  try {
    const role = await prisma.role.create({
      data: {
        companyId: user.companyId,
        name: parsed.name,
        description: parsed.description ?? null,
        permissions: { create: parsed.permissions.map((permission) => ({ permission })) },
      },
      include: { permissions: { select: { permission: true } } },
    });
    await recordSecurityEvent({
      action: SECURITY_EVENTS.roleCreated,
      outcome: "success",
      companyId: user.companyId,
      actorId: user.userId,
      actorEmail: user.email,
      targetType: "role",
      targetId: role.id,
      request: req,
      metadata: { name: role.name, permissions: parsed.permissions.join(",") },
    });
    return NextResponse.json(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map((p) => p.permission),
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });
    }
    console.error("Create role error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { roleMatrix } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

/** GET /api/roles — system roles and their permission matrix (access control view). */
export async function GET(req: Request) {
  const { deny } = await requirePermission(req, "users:manage");
  if (deny) return deny;
  return NextResponse.json({ roles: roleMatrix() });
}

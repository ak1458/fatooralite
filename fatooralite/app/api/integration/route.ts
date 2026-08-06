import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

/** GET /api/integration?companyId — real ZATCA connection + certificate state. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const cert = await prisma.certificate.findFirst({
    where: { companyId, kind: "production", status: "active" },
    orderBy: { createdAt: "desc" },
    select: { serial: true, status: true, issuedAt: true, expiresAt: true, secret: true },
  });

  const isLocal = cert?.serial === "LOCAL-DEV" || cert?.secret === "LOCAL-DEV-SECRET";
  const daysLeft = cert?.expiresAt
    ? Math.max(0, Math.floor((cert.expiresAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return NextResponse.json({
    environment: process.env.ZATCA_MODE ?? "sandbox",
    certificate: cert
      ? {
          serial: cert.serial,
          status: cert.status,
          issuedAt: cert.issuedAt,
          expiresAt: cert.expiresAt,
          daysLeft,
          isLocal,
        }
      : null,
    // Local cert can sign + produce QR/PDF; real gateway clearance needs a real CSID.
    canIssue: !!cert,
    canClear: !!cert && !isLocal,
  });
}

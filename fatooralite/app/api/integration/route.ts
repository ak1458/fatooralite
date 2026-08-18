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

  // Select on status, not kind — exactly as lib/db/repo.ts getActiveCertificate
  // does, because that is what decides whether signing works. Filtering on
  // kind: "production" here dated from before locally-provisioned certificates
  // were relabelled to kind "local": afterwards this query matched nothing for
  // them, so a tenant that was signing invoices perfectly well was told it had
  // no certificate and could not issue.
  const cert = await prisma.certificate.findFirst({
    where: { companyId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { serial: true, status: true, kind: true, issuedAt: true, expiresAt: true },
  });

  // kind is the authoritative marker now; the serial is kept as a fallback for
  // rows written before the relabel migration. The CSID secret is no longer
  // compared here — it is encrypted at rest (lib/crypto/encrypt.ts) and reading
  // it just to test a sentinel string would mean decrypting a credential for a
  // label.
  const isLocal = cert?.kind === "local" || cert?.serial === "LOCAL-DEV";
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

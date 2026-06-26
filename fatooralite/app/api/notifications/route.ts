import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";
import { generateNotifications } from "@/lib/notifications/generate";

export const runtime = "nodejs";

/** Scan the company's compliance state and create notifications for new risks. */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  try {
    const { created } = await generateNotifications(companyId);
    return NextResponse.json({ created });
  } catch (error) {
    console.error("Notification generation error:", error);
    return NextResponse.json({ error: "Failed to generate notifications" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const notifications = await prisma.notification.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

export async function PUT(req: Request) {
  try {
    const { id, read } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { deny } = await requirePermission(req, "audit:view", notification.companyId);
    if (deny) return deny;

    const updated = await prisma.notification.update({
      where: { id },
      data: { read },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

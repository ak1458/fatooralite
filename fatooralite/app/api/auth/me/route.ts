import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";

/** GET /api/auth/me — current session user (or null). */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  return NextResponse.json({ user });
}

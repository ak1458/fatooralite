import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        service: "Fatoora Lite Pro",
        timestamp,
        database: "connected",
        environment: process.env.NODE_ENV || "development",
      },
      { status: 200 }
    );
  } catch (error) {
    // Log the real error server-side only — a raw DB error message can leak
    // connection details (host, driver internals) to anyone hitting this
    // unauthenticated endpoint.
    console.error("Health check DB failure:", error);
    return NextResponse.json(
      {
        status: "degraded",
        service: "Fatoora Lite Pro",
        timestamp,
        database: "error",
      },
      { status: 503 }
    );
  }
}

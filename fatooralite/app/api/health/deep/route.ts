import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { isConfigured, getChatProvider } from "@/lib/ai/provider";
import { gatewayBaseUrl } from "@/lib/zatca/client";
import { getJobStats } from "@/lib/services/job-stats";

export const runtime = "nodejs";

/**
 * GET /api/health/deep — dependency-level health for an administrator to
 * trace USER ACTION -> REQUEST -> APPLICATION -> DATABASE -> EXTERNAL SERVICE
 * -> RESULT without exposing secrets (Phase 2 / W4).
 *
 * Deliberately NOT public: it makes outbound calls (ZATCA reachability) on
 * every hit, which an unauthenticated endpoint would turn into a free
 * amplification/probing primitive. Gated the same way as the cron routes —
 * fail closed on a missing CRON_SECRET, reusing that credential rather than
 * minting a third one for what is, functionally, the same "operator-only
 * request" trust boundary.
 */
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [db, zatca, jobs] = await Promise.all([checkDatabase(), checkZatca(), getJobStats()]);
  const ai = checkAi();
  const email = { configured: Boolean(process.env.RESEND_API_KEY) };
  const redis = { configured: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) };

  const healthy = db.ok && zatca.ok;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", timestamp: new Date().toISOString(), db, zatca, ai, email, redis, jobs },
    { status: healthy ? 200 : 503 },
  );
}

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  }
}

async function checkZatca(): Promise<{ ok: boolean; latencyMs: number; mode: string }> {
  const mode = process.env.ZATCA_MODE === "production" ? "production" : "sandbox";
  const started = Date.now();
  try {
    // Reachability only — never submits anything. A non-2xx/redirect response
    // from the gateway's base path still proves the host is reachable.
    await fetch(gatewayBaseUrl(mode), { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return { ok: true, latencyMs: Date.now() - started, mode };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, mode };
  }
}

function checkAi(): { configured: boolean; provider: string } {
  return { configured: isConfigured(), provider: getChatProvider().name };
}

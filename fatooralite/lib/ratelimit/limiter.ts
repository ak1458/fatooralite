/**
 * Rate limiting with a distributed backend when available, degrading
 * gracefully to a single-instance in-memory fallback otherwise.
 *
 * Multi-instance deploys (Vercel serverless) share no memory between
 * invocations, so the plain in-memory token bucket that used to live in
 * proxy.ts only rate-limits per instance. When UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are both set, counts are kept in Upstash Redis via
 * its REST API (plain fetch — no @upstash/redis or @upstash/ratelimit
 * dependency required) so every instance shares the same counter. Without
 * those vars — or if Upstash is unreachable — this falls back to the
 * in-memory bucket, following this repo's convention (lib/ai/provider.ts,
 * lib/env.ts): never hard-require a paid service, always have a safe local
 * fallback, warn rather than crash.
 */

// ---- In-memory fallback (module-scoped — persists across calls within the
// same instance, same behavior as the code this replaces). -----------------

const memoryCache = new Map<string, { count: number; lastReset: number }>();

function isRateLimitedInMemory(
  bucket: string,
  ip: string,
  limit: number,
  windowSeconds: number,
): boolean {
  const key = `${bucket}:${ip}`;
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const record = memoryCache.get(key) || { count: 0, lastReset: now };

  if (now - record.lastReset > windowMs) {
    record.count = 1;
    record.lastReset = now;
  } else {
    record.count += 1;
  }

  memoryCache.set(key, record);
  return record.count > limit;
}

// ---- Upstash Redis REST backend --------------------------------------------

interface UpstashPipelineResult {
  result?: unknown;
  error?: string;
}

async function isRateLimitedUpstash(
  url: string,
  token: string,
  bucket: string,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const key = `ratelimit:${bucket}:${ip}`;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds, "NX"],
    ]),
  });

  if (!res.ok) {
    throw new Error(`Upstash rate limit request failed with status ${res.status}`);
  }

  const results = (await res.json()) as UpstashPipelineResult[];
  const count = results?.[0]?.result;
  if (typeof count !== "number") {
    throw new Error("Upstash rate limit response was malformed");
  }

  return count > limit;
}

let upstashWarned = false;

/**
 * Returns true if the given (bucket, ip) pair has exceeded `limit` requests
 * within the trailing `windowSeconds` window.
 *
 * Uses Upstash Redis (shared across instances) when UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN are both set; otherwise — or if Upstash is
 * unreachable/misbehaving — falls back to the in-memory, single-instance
 * limiter. A broken distributed backend must not 500 every request, and must
 * not silently allow unlimited requests either, so failures fall through to
 * the working in-memory limiter rather than failing open or throwing.
 */
export async function isRateLimited(
  bucket: string,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await isRateLimitedUpstash(url, token, bucket, ip, limit, windowSeconds);
    } catch (err) {
      if (!upstashWarned) {
        upstashWarned = true;
        console.warn(
          "⚠️  Upstash rate limiter unavailable, falling back to in-memory (single-instance) rate limiting:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  return isRateLimitedInMemory(bucket, ip, limit, windowSeconds);
}

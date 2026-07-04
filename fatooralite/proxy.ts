import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// In-memory token bucket for basic rate limiting (per instance — put a shared
// limiter such as Upstash in front for multi-instance deployments).
const rateLimitCache = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per minute per IP
// Credential endpoints get a much tighter budget (brute-force protection).
// Overridable for test environments (AUTH_RATE_LIMIT).
const MAX_AUTH_REQUESTS = Number(process.env.AUTH_RATE_LIMIT ?? 10);

function isRateLimited(ip: string, limit: number, bucket: string): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const record = rateLimitCache.get(key) || { count: 0, lastReset: now };

  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    record.count = 1;
    record.lastReset = now;
  } else {
    record.count += 1;
  }

  rateLimitCache.set(key, record);
  return record.count > limit;
}

/** Baseline security headers applied to every response. */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

/**
 * Route protection (Next.js 16 "proxy", formerly middleware). Disabled by
 * default so the demo runs open; set AUTH_ENFORCE=true to require a valid
 * session for every page. API routes self-enforce and return JSON 401/403.
 */
export async function proxy(req: NextRequest) {
  // Rate limiting: strict budget on credential endpoints, general budget elsewhere.
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const isCredentialEndpoint =
    req.method === "POST" &&
    (req.nextUrl.pathname.startsWith("/api/auth/login") ||
      req.nextUrl.pathname.startsWith("/api/auth/register") ||
      req.nextUrl.pathname.startsWith("/api/auth/forgot") ||
      req.nextUrl.pathname.startsWith("/api/auth/reset"));
  if (isCredentialEndpoint && isRateLimited(ip, MAX_AUTH_REQUESTS, "auth")) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }
  if (isRateLimited(ip, MAX_REQUESTS, "all")) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // Basic CSRF check for state-changing operations
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const host = req.headers.get("host");
    // If we have an origin and host, they should match for same-site protection
    if (origin && host) {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return new NextResponse("CSRF token validation failed", { status: 403 });
      }
    }
  }

  if (process.env.AUTH_ENFORCE !== "true") return withSecurityHeaders(NextResponse.next());

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/api/auth")
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(url));
  }
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

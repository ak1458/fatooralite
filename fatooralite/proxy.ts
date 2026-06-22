import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// In-memory token bucket for basic rate limiting
const rateLimitCache = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitCache.get(ip) || { count: 0, lastReset: now };

  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    record.count = 1;
    record.lastReset = now;
  } else {
    record.count += 1;
  }

  rateLimitCache.set(ip, record);
  return record.count > MAX_REQUESTS;
}

/**
 * Route protection (Next.js 16 "proxy", formerly middleware). Disabled by
 * default so the demo runs open; set AUTH_ENFORCE=true to require a valid
 * session for every page. API routes self-enforce and return JSON 401/403.
 */
export async function proxy(req: NextRequest) {
  // Rate limiting check
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  if (isRateLimited(ip)) {
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

  if (process.env.AUTH_ENFORCE !== "true") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

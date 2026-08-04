import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { isRateLimited } from "@/lib/ratelimit/limiter";

// Rate limiting window shared by both buckets below. The limiter itself
// (lib/ratelimit/limiter.ts) uses Upstash Redis when configured — so limits
// hold across multiple server instances — and falls back to an in-memory
// token bucket otherwise (see that file for details).
const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute
const MAX_REQUESTS = 100; // per minute per IP
// Credential endpoints get a much tighter budget (brute-force protection).
// Overridable for test environments (AUTH_RATE_LIMIT).
const MAX_AUTH_REQUESTS = Number(process.env.AUTH_RATE_LIMIT ?? 10);

/** Baseline security headers applied to every response. */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // 'unsafe-eval' is removed in production to block eval-based XSS.
  // 'unsafe-inline' is required by Next.js for critical CSS injection.
  // A nonce-based CSP is the ideal end state (tracked as a follow-up).
  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = isProduction
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'"; // dev only: Next.js HMR needs eval

  res.headers.set(
    "Content-Security-Policy",
    [
      `default-src 'self'`,
      `script-src ${scriptSrc}`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data:`,
      `connect-src 'self' https:`,
      `object-src 'none'`,
      `frame-ancestors 'none'`,
      isProduction ? `upgrade-insecure-requests` : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return res;
}

/**
 * Route protection (Next.js proxy). Default is ENFORCED for production security;
 * set AUTH_ENFORCE=false only for unauthenticated local development demos.
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
  if (
    isCredentialEndpoint &&
    (await isRateLimited("auth", ip, MAX_AUTH_REQUESTS, RATE_LIMIT_WINDOW_SECONDS))
  ) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }
  if (await isRateLimited("all", ip, MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // Basic CSRF check for state-changing operations
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return new NextResponse("CSRF token validation failed", { status: 403 });
        }
      } catch {
        return new NextResponse("CSRF origin invalid", { status: 403 });
      }
    }
  }

  // Allow explicit disable ONLY if explicitly set to "false"
  if (process.env.AUTH_ENFORCE === "false") return withSecurityHeaders(NextResponse.next());

  const { pathname } = req.nextUrl;
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/cookie-policy") ||
    pathname.startsWith("/disclaimer") ||
    pathname.startsWith("/refund-policy") ||
    pathname.startsWith("/cancellation-policy") ||
    pathname.startsWith("/data-retention") ||
    pathname.startsWith("/acceptable-use") ||
    pathname.startsWith("/security-policy") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    // Both below have their own request-time secret check inside the route
    // handler (CRON_SECRET bearer / Moyasar shared secret_token) — they are
    // called by external systems with no session cookie, so they must be
    // reachable here or that inner check never runs at all. This proxy gate
    // would otherwise redirect them to /login, which for a non-browser
    // caller (Vercel Cron, Moyasar's webhook) is an opaque, silent failure.
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/billing/webhook");

  if (isPublicRoute) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    // API routes must fail with a JSON 401, not a redirect: a fetch() call
    // silently follows a 307 and hands the caller the /login page's HTML,
    // which is not what any API consumer expects and breaks JSON parsing
    // silently (this was undetected until the first real deployment — see
    // handoff.md). Page routes keep the redirect-to-/login UX.
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json({ error: "Authentication required" }, { status: 401 }));
    }
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { isRateLimited } from "@/lib/ratelimit/limiter";
import { clientIpFor } from "@/lib/ratelimit/client-ip";

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
function withSecurityHeaders(res: NextResponse, req?: NextRequest): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // HSTS only over a secure connection. It does nothing on plain HTTP by
  // spec, and `preload` with a one-year max-age is not something to emit from
  // a localhost dev server — a browser that does honour it force-upgrades
  // every other http://localhost project on that machine for a year.
  const proto = req?.headers.get("x-forwarded-proto") ?? req?.nextUrl.protocol.replace(":", "");
  if (proto === "https") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

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
 * Public, tenant-independent files. Exact paths and a small set of prefixes —
 * never a bare extension check, which would also unlock any future
 * authenticated route that happens to end in one.
 */
const PUBLIC_ASSET_PATHS = new Set([
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/apple-icon.png",
  "/icon.png",
  "/opengraph-image",
  "/twitter-image",
]);

function isPublicAsset(pathname: string): boolean {
  return PUBLIC_ASSET_PATHS.has(pathname) || pathname.startsWith("/icons/");
}

/**
 * Route protection (Next.js proxy). Default is ENFORCED for production security;
 * set AUTH_ENFORCE=false only for unauthenticated local development demos.
 */
export async function proxy(req: NextRequest) {
  // A NUL byte is never legitimate in a URL, and PostgreSQL rejects one inside
  // a text value outright. Any route that passed a path segment or query value
  // into a Prisma query therefore answered `?status=%00` or `/api/audit/%00`
  // with an unhandled 500 — an authenticated caller could produce server errors
  // on demand and bury real faults in the error log. Rejecting it here fixes
  // the whole class in one place instead of per route, and keeps future routes
  // covered by default.
  if (/%00/i.test(req.url)) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Malformed request URL" }, { status: 400 }),
      req,
    );
  }

  // Rate limiting: strict budget on credential endpoints, general budget elsewhere.
  // Never key the limiter on the raw X-Forwarded-For header — the caller writes
  // it, so a fresh value per request is a fresh bucket per request and the
  // limit stops existing. See lib/ratelimit/client-ip.ts.
  const ip = clientIpFor(req.headers);
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
  if (process.env.AUTH_ENFORCE === "false") return withSecurityHeaders(NextResponse.next(), req);

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
    pathname.startsWith("/api/billing/webhook") ||
    // Static and PWA assets. These were gated, which broke three things
    // silently: the service worker never registered at all (a browser refuses
    // a worker script that arrives via a redirect), the manifest could not be
    // read so there was no install prompt, and crawlers asking for robots.txt
    // or sitemap.xml were handed the login page instead. None of them carry
    // tenant data — they are the same bytes for every visitor.
    isPublicAsset(pathname);

  if (isPublicRoute) {
    return withSecurityHeaders(NextResponse.next(), req);
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
      return withSecurityHeaders(NextResponse.json({ error: "Authentication required" }, { status: 401 }), req);
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(url), req);
  }
  return withSecurityHeaders(NextResponse.next(), req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

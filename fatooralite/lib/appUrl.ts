/**
 * The deployment's public base URL, for anything that has to emit an absolute
 * one: robots.txt's Sitemap line, sitemap.xml's entries, OpenGraph metadata.
 *
 * These three used to hardcode `https://fatooralite.com` — a domain that is
 * not where this is deployed — as a literal in one place and as a fallback in
 * the others. Pointing crawlers and link previews at a domain nobody controls
 * is worse than pointing them at localhost, which is at least honestly wrong
 * and obvious in review.
 *
 * `NEXT_PUBLIC_APP_URL` is set on the deployment (see docs/09-deployment.md);
 * the localhost fallback is only for a developer running `next build` without
 * an environment.
 */
export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

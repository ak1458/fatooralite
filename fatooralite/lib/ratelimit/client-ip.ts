/**
 * Derive the rate-limiting identity of a request.
 *
 * `X-Forwarded-For` is a client-supplied header. Using it verbatim as the
 * limiter's bucket key means the caller chooses its own bucket: sending a
 * different value on each request mints a fresh counter every time and the
 * limit never applies. That is not theoretical — the audit suite defeated the
 * credential-endpoint limit with fourteen requests and a counter variable.
 *
 * The chain reads left to right as "originating client, then each proxy that
 * forwarded it". Only the entries appended by infrastructure *we* run can be
 * trusted; everything to the left of those is whatever the caller wrote. So the
 * address is read from the right, skipping TRUSTED_PROXY_HOPS - 1 entries.
 *
 * TRUSTED_PROXY_HOPS defaults to 1, which is correct for Vercel (its edge sets
 * the header to the real client address) and for any single reverse proxy that
 * appends. Behind two proxies, set it to 2.
 *
 * Deploying with NO proxy in front leaves the header fully caller-controlled and
 * nothing here can fix that — the limit is then per-claimed-identity only. See
 * docs/09-deployment.md.
 */
export function clientIpFor(headers: Headers): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1);

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (chain.length > 0) {
      // Rightmost entry is the one our own edge appended; step left only as far
      // as the number of proxies we actually operate.
      const index = Math.max(0, chain.length - hops);
      return chain[index];
    }
  }

  // x-real-ip is set by the proxy, not forwarded from the client, on every
  // platform this targets.
  return headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

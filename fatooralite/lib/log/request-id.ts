/**
 * Header carrying the per-request correlation id. Minted once per request by
 * proxy.ts and forwarded into the app; route handlers read it via
 * lib/log/logger.ts's `loggerFor(req)`. Its own tiny module so proxy.ts (Edge
 * middleware — keep its dependency graph minimal) and route handlers (Node
 * runtime) can both import it without pulling in the other.
 */
export const REQUEST_ID_HEADER = "x-request-id";

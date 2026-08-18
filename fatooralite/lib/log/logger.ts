import { redactFields } from "./redact";
import { REQUEST_ID_HEADER } from "./request-id";

/**
 * Structured logging (Phase 2 / W4). One JSON line per event via `console.*`
 * — Vercel captures stdout/stderr directly, so this is the whole delivery
 * mechanism; no log-shipping dependency is added. `redactFields` is the same
 * rule set the security-event trail uses, so a key considered sensitive in
 * one place can't be forgotten in the other.
 *
 * Logging must never throw and must never break the request it describes —
 * same contract as `recordSecurityEvent`.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** A logger that merges `context` into every field set it emits (e.g. {requestId, companyId}). */
  child(context: LogFields): Logger;
}

function emit(level: LogLevel, event: string, fields: LogFields): void {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...redactFields(fields) });
    // Resolved at call time, not captured at module load — so test spies
    // (vi.spyOn(console, "info")) intercept it, and so a runtime console
    // monkey-patch (as some log drains install) still takes effect.
    console[level](line);
  } catch {
    // A logging failure must never break the request it describes.
  }
}

function makeLogger(context: LogFields): Logger {
  return {
    debug: (event, fields) => emit("debug", event, { ...context, ...fields }),
    info: (event, fields) => emit("info", event, { ...context, ...fields }),
    warn: (event, fields) => emit("warn", event, { ...context, ...fields }),
    error: (event, fields) => emit("error", event, { ...context, ...fields }),
    child: (moreContext) => makeLogger({ ...context, ...moreContext }),
  };
}

/** Root logger, no request context. */
export const log: Logger = makeLogger({});

/**
 * A logger carrying this request's correlation id (minted server-side by
 * proxy.ts, never read from a client-supplied header — see REQUEST_ID_HEADER
 * there). Falls back to no id only for a request that somehow bypassed the
 * proxy (there isn't one in production; defensive for tests/scripts).
 */
export function loggerFor(req: Request): Logger {
  const requestId = req.headers.get(REQUEST_ID_HEADER) ?? undefined;
  return makeLogger(requestId ? { requestId } : {});
}

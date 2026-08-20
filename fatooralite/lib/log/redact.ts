/**
 * Shared redaction rules for anything written to logs or the security-event
 * trail. Single source of truth so a key considered sensitive in one place
 * (structured logs) can't be forgotten in the other (SecurityEvent.metadata).
 */

/**
 * Keys whose values are never stored, whatever a caller passes. Matched as a
 * substring against the lower-cased key, so `newPassword` and `csidSecret` are
 * both caught.
 */
export const SENSITIVE_KEY = /pass|secret|token|key|cookie|authorization|credential|otp|nonce|hash|signature/i;

/** Drop sensitive keys and clamp value sizes. Never throws. */
export function redactFields(fields: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!fields) return {};
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(k)) {
      safe[k] = "[redacted]";
      continue;
    }
    if (v === null || v === undefined) continue;
    if (typeof v === "string") safe[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean") safe[k] = v;
    else {
      try {
        const s = JSON.stringify(v);
        safe[k] = s.length > 200 ? `${s.slice(0, 200)}…` : s;
      } catch {
        safe[k] = "[unserializable]";
      }
    }
  }
  return safe;
}

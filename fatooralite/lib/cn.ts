/**
 * Tiny class-name joiner: keeps truthy strings, drops falsy ones.
 * Intentionally dependency-free and easy to read.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

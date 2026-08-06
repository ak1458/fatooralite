/**
 * The development-only session secret shipped in .env.example.
 *
 * Defined here rather than inline so the signer (lib/auth/session.ts) and the
 * production boot guard (lib/env.ts) compare against the same literal — if
 * they drifted, the guard would pass a value the signer then refuses, which is
 * exactly the failure this pair exists to prevent.
 *
 * Anything signed with this is forgeable by anyone who has read the repo.
 */
export const DEV_AUTH_SECRET = "dev-insecure-secret-change-me-1234567890";

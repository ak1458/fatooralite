import { z } from "zod";
import { DEV_AUTH_SECRET } from "@/lib/auth/dev-secret";

/**
 * Runtime environment validation.  Imported once at boot (via db/client.ts)
 * so mis-configuration fails fast instead of exploding on the first request.
 */

const envSchema = z.object({
  /* ---- required (throw if absent) ---- */
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be set"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL must be set").optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),

  /* ---- optional (warn if absent) ---- */
  /**
   * Which AI backend lib/ai/provider.ts builds. Each has its own key below;
   * only the selected provider's key matters, so all are optional here and
   * the "AI is unconfigured" warning is resolved per provider.
   */
  AI_PROVIDER: z.enum(["openrouter", "groq", "anthropic", "openai"]).optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ZATCA_MODE: z.enum(["simulation", "sandbox", "production"]).optional(),
  SEED_DEMO: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  AUTH_ENFORCE: z.string().optional(),
  /**
   * CRON_SECRET: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
   * Required in production — without it the zatca-reporting cron endpoint
   * is open to anyone who discovers the URL.
   */
  CRON_SECRET: z.string().optional(),

  /* ---- optional distributed rate limiting ---- */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  /* ---- optional (no warning — feature is allowed to be unconfigured) ---- */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _validated = false;

/**
 * Parse and validate `process.env`.  Called once; subsequent calls are no-ops.
 * Required vars throw; optional vars log a warning.
 */
export function validateEnv(): Env {
  if (_validated) return envSchema.parse(process.env);

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n⛔  Environment validation failed:\n${missing}\n\nSet the required variables in .env or platform env vars.\n`,
    );
  }

  const aiProvider = result.data.AI_PROVIDER ?? "openrouter";
  const aiKeyVar = {
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
  }[aiProvider];
  if (!process.env[aiKeyVar]) {
    console.warn(
      `⚠️  ${aiKeyVar} not set (AI_PROVIDER=${aiProvider}) — AI assistant will run in mock/offline mode.`,
    );
  }

  if (!result.data.ENCRYPTION_KEY) {
    console.warn(
      "⚠️  ENCRYPTION_KEY not set — ZATCA private keys will not be encrypted at rest.",
    );
  }

  // Production must not run with the demo-friendly defaults. These are
  // runtime requirements — `next build` also runs with NODE_ENV=production
  // while collecting page data, and a build machine may legitimately lack
  // runtime secrets, so skip during the build phase.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    if (!result.data.ENCRYPTION_KEY) {
      throw new Error(
        "⛔  ENCRYPTION_KEY is required in production (ZATCA private keys must be encrypted at rest).\n" +
        "    Generate with: openssl rand -base64 32",
      );
    }
    // Use strict equality so typos like AUTH_ENFORCE=True or AUTH_ENFORCE=yes
    // don't silently bypass the guard.
    if (result.data.AUTH_ENFORCE !== "true") {
      throw new Error(
        "⛔  AUTH_ENFORCE=true is required in production (login + RBAC enforcement).",
      );
    }
    if (!result.data.CRON_SECRET) {
      throw new Error(
        "⛔  CRON_SECRET is required in production (protects the ZATCA reporting cron endpoint).\n" +
        "    Generate with: openssl rand -base64 32, then set in Vercel dashboard and vercel.json.",
      );
    }
    // The dev placeholder is published in .env.example and in this repo, so a
    // deployment carrying it can have its session cookies forged by anyone.
    // lib/auth/session.ts refuses to sign with it — but that throws on the
    // first request that needs a session, which for a fresh deployment is a
    // user's registration, *after* their company row has already committed.
    // Failing at boot instead turns a corrupted signup into a failed deploy.
    if (result.data.AUTH_SECRET === DEV_AUTH_SECRET) {
      throw new Error(
        "⛔  AUTH_SECRET is still the development placeholder from .env.example.\n" +
        "    Session cookies signed with it are forgeable by anyone who has read this repo.\n" +
        "    Generate with: openssl rand -base64 32 | tr -d '\\r\\n'",
      );
    }
  }

  _validated = true;
  return result.data;
}

import { z } from "zod";

/**
 * Runtime environment validation.  Imported once at boot (via db/client.ts)
 * so mis-configuration fails fast instead of exploding on the first request.
 */

const envSchema = z.object({
  /* ---- required (throw if absent) ---- */
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be set"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL must be set").optional(),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET must be set"),

  /* ---- optional (warn if absent) ---- */
  OPENROUTER_API_KEY: z.string().optional(),
  ZATCA_MODE: z.enum(["simulation", "sandbox", "production"]).optional(),
  SEED_DEMO: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  AUTH_ENFORCE: z.string().optional(),
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

  if (!result.data.OPENROUTER_API_KEY) {
    console.warn(
      "⚠️  OPENROUTER_API_KEY not set — AI assistant will run in mock/offline mode.",
    );
  }

  if (!result.data.ENCRYPTION_KEY) {
    console.warn(
      "⚠️  ENCRYPTION_KEY not set — ZATCA private keys will not be encrypted at rest.",
    );
  }

  _validated = true;
  return result.data;
}

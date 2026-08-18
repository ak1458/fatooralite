import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/.next/**"],
    // Provide fallback env vars so validateEnv() (called at module-load by
    // lib/db/client.ts) doesn't crash in CI where no .env file exists.
    // These are never used to connect to a real database — DB-dependent tests
    // are already gated behind TEST_DATABASE_URL via describe.skipIf(!hasTestDb).
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://ci:ci@localhost:5432/ci_placeholder",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me-1234567890",
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});

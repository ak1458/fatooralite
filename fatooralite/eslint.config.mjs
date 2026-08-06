import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Layer boundaries.
 *
 * The architecture documented in .github/CONTRIBUTING.md is
 *   lib/zatca -> lib/db -> lib/services -> app/api -> UI
 * and a layer may only import from layers below it. That was a convention
 * with nothing enforcing it. These rules make a violation a lint error
 * instead of something a reviewer has to notice.
 *
 * Implemented with the built-in no-restricted-imports rather than
 * eslint-plugin-boundaries — the same reason Upstash, Resend and Moyasar are
 * called over plain fetch here: it does the job without another dependency.
 */
const layerBoundaries = [
  {
    files: ["lib/zatca/**/*.ts"],
    ignores: ["lib/zatca/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/*", "@/lib/services", "@/lib/services/*", "@/app/*", "@/components/*"],
              message:
                "lib/zatca is the pure signing engine: no database, service, route or UI imports. Take what it needs as arguments.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/db/**/*.ts"],
    ignores: ["lib/db/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services", "@/lib/services/*", "@/app/*", "@/components/*"],
              message:
                "lib/db is the repository layer: it is called by services, it does not call them, and it never reaches into routes or UI.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/**/*.ts"],
    ignores: ["lib/services/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/components/*"],
              message: "Services must not import routes or UI. Return data and let the route shape the response.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    ignores: ["components/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/*", "@/lib/services", "@/lib/services/*"],
              message:
                "Components are client-side: reach the database through an API route, never by importing a repository or service (which would also leak server-only code into the bundle).",
            },
          ],
        },
      ],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow intentionally-unused args/vars when prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  ...layerBoundaries,
]);

export default eslintConfig;

/**
 * The full set of flags this app knows about, and their code-level default —
 * the value used when neither an env override nor a per-company row exists.
 * Adding a new flag means adding it here first (single source of truth for
 * "what flags exist" — scripts/set-flag.ts --list reads this).
 */
export const FLAG_DEFAULTS = {
  /** N7 — email invoice delivery. Default ON: a core, already-shipped capability. */
  emailInvoiceDelivery: true,
  /** N4 — CSV import of customers/products. Default OFF: dark launch of the first upload surface. */
  csvImport: false,
} as const satisfies Record<string, boolean>;

export type FlagName = keyof typeof FLAG_DEFAULTS;

export const FLAG_NAMES = Object.keys(FLAG_DEFAULTS) as FlagName[];

/** Env var name a flag can be globally forced through — a kill switch (A-217). */
export function envOverrideName(flag: FlagName): string {
  const snake = flag.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();
  return `FEATURE_${snake}`;
}

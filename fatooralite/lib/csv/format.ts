/**
 * Shared, formula-injection-hardened CSV cell/row formatting for export
 * routes (Phase 5 / N4). `app/api/reports/route.ts` has its own local
 * `csvCell` that quotes correctly but does not neutralize formula
 * injection — left untouched here deliberately (a 2-line mechanical
 * follow-up, not required by this phase, and D1/VAT-report territory).
 */

/** Cell values that a spreadsheet would interpret as a formula if opened unescaped. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  // Prefix a leading apostrophe so Excel/Sheets render the literal text
  // instead of evaluating it as a formula — the standard CSV-export mitigation.
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

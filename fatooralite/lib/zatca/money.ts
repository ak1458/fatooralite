import type { InvoiceLine, InvoiceTotals } from "./types";

export const STANDARD_VAT_RATE = 0.15;

/** Round half-up to 2 decimal places (currency). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Net (VAT-exclusive) amount for a line. */
export function lineNet(line: InvoiceLine): number {
  return round2(line.quantity * line.unitPrice);
}

/** VAT amount for a line. */
export function lineVat(line: InvoiceLine): number {
  const rate = line.vatRate ?? STANDARD_VAT_RATE;
  return round2(lineNet(line) * rate);
}

/** Aggregate totals across all lines. */
export function invoiceTotals(lines: InvoiceLine[]): InvoiceTotals {
  let taxable = 0;
  let vat = 0;
  for (const l of lines) {
    taxable += lineNet(l);
    vat += lineVat(l);
  }
  taxable = round2(taxable);
  vat = round2(vat);
  return { taxableAmount: taxable, vatAmount: vat, grandTotal: round2(taxable + vat) };
}

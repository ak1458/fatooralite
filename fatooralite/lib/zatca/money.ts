import type { InvoiceLine, InvoiceTotals, TaxSubtotal, TaxCategoryCode, AllowanceCharge } from "./types";

export const STANDARD_VAT_RATE = 0.15;

/** Tax-category code → VAT percentage. */
const CATEGORY_RATE: Record<TaxCategoryCode, number> = {
  S: 0.15,
  Z: 0,
  E: 0,
  O: 0,
};

/** Round half-up to 2 decimal places (currency). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Effective VAT rate for a line, respecting tax category if set. */
export function effectiveRate(line: InvoiceLine): number {
  if (line.taxCategory && line.taxCategory !== "S") {
    return CATEGORY_RATE[line.taxCategory];
  }
  return line.vatRate ?? STANDARD_VAT_RATE;
}

/** Net (VAT-exclusive) amount for a line, after line-level allowances/charges. */
export function lineNet(line: InvoiceLine): number {
  let net = round2(line.quantity * line.unitPrice);
  if (line.allowances) {
    for (const ac of line.allowances) {
      net = ac.isCharge ? round2(net + ac.amount) : round2(net - ac.amount);
    }
  }
  return net;
}

/** VAT amount for a line. */
export function lineVat(line: InvoiceLine): number {
  const rate = effectiveRate(line);
  return round2(lineNet(line) * rate);
}

/** Compute per-category tax subtotals from invoice lines. */
export function taxSubtotals(lines: InvoiceLine[]): TaxSubtotal[] {
  const map = new Map<TaxCategoryCode, { taxable: number; tax: number; rate: number; reason?: string; reasonCode?: string }>();

  for (const line of lines) {
    const cat: TaxCategoryCode = line.taxCategory ?? "S";
    const rate = effectiveRate(line);
    const net = lineNet(line);
    const vat = lineVat(line);

    const existing = map.get(cat);
    if (existing) {
      existing.taxable = round2(existing.taxable + net);
      existing.tax = round2(existing.tax + vat);
    } else {
      map.set(cat, {
        taxable: net,
        tax: vat,
        rate: round2(rate * 100),
        reason: line.exemptionReason,
        reasonCode: line.exemptionReasonCode,
      });
    }
  }

  return Array.from(map.entries()).map(([cat, v]) => ({
    taxCategory: cat,
    taxableAmount: v.taxable,
    taxAmount: v.tax,
    percent: v.rate,
    exemptionReason: v.reason,
    exemptionReasonCode: v.reasonCode,
  }));
}

/** Sum of all document-level allowances. */
function sumAllowances(allowances: AllowanceCharge[] | undefined, isCharge: boolean): number {
  if (!allowances) return 0;
  return round2(
    allowances
      .filter((a) => a.isCharge === isCharge)
      .reduce((sum, a) => sum + a.amount, 0),
  );
}

/** Aggregate totals across all lines, with document-level allowances/charges. */
export function invoiceTotals(
  lines: InvoiceLine[],
  documentAllowances?: AllowanceCharge[],
): InvoiceTotals {
  let taxable = 0;
  let vat = 0;
  for (const l of lines) {
    taxable += lineNet(l);
    vat += lineVat(l);
  }
  taxable = round2(taxable);
  vat = round2(vat);

  const allowanceTotalAmount = sumAllowances(documentAllowances, false);
  const chargeTotalAmount = sumAllowances(documentAllowances, true);

  // Document-level allowances reduce the taxable amount
  const adjustedTaxable = round2(taxable - allowanceTotalAmount + chargeTotalAmount);

  return {
    taxableAmount: adjustedTaxable,
    vatAmount: vat,
    grandTotal: round2(adjustedTaxable + vat),
    allowanceTotalAmount,
    chargeTotalAmount,
    taxSubtotals: taxSubtotals(lines),
  };
}

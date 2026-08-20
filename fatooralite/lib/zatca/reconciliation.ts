import { round2 } from "./money";

/**
 * D9 (docs/audit/decision-register.md) — Option B: credit/debit note amounts
 * stay positive in storage (createInvoiceSchema and the W11 CHECK constraints
 * both require it; changing that is Option A, deliberately not chosen — see
 * the decision register for the full comparison), and every place that sums
 * amounts ACROSS invoices nets a credit note out instead of adding it in.
 *
 * Before this, a credit note issued for a returned sale inflated the VAT
 * return and every other cross-invoice total instead of reducing them — a
 * live correctness bug, not a hypothetical one, confirmed while implementing
 * N8 (Phase 3). This is the one place that decides the sign; every
 * aggregation call site must go through it rather than reimplementing the
 * `documentType` branch itself, which is exactly how this bug reappeared
 * silently in three different files the first time.
 *
 * Debit notes are NOT sign-flipped — a debit note is an additional amount
 * owed, the same direction as an ordinary invoice.
 */

export interface NetAmountInput {
  documentType: string;
  taxableAmount: number;
  vatAmount: number;
  grandTotal: number;
}

export interface NetAmounts {
  taxableAmount: number;
  vatAmount: number;
  grandTotal: number;
}

/** The sign a document's stored (always-positive) amounts contribute with. */
export function netSign(documentType: string): 1 | -1 {
  return documentType === "credit" ? -1 : 1;
}

/** One invoice/note's amounts, sign-adjusted for cross-document aggregation. */
export function netEffect(inv: NetAmountInput): NetAmounts {
  const sign = netSign(inv.documentType);
  return {
    taxableAmount: round2(sign * inv.taxableAmount),
    vatAmount: round2(sign * inv.vatAmount),
    grandTotal: round2(sign * inv.grandTotal),
  };
}

/** Sum net-adjusted amounts across a set of invoices/notes. */
export function sumNet(invoices: NetAmountInput[]): NetAmounts {
  let taxableAmount = 0;
  let vatAmount = 0;
  let grandTotal = 0;
  for (const inv of invoices) {
    const net = netEffect(inv);
    taxableAmount = round2(taxableAmount + net.taxableAmount);
    vatAmount = round2(vatAmount + net.vatAmount);
    grandTotal = round2(grandTotal + net.grandTotal);
  }
  return { taxableAmount, vatAmount, grandTotal };
}

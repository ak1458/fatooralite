export interface ClearanceInvoice {
  kind: string;
  status: string;
  vatAmount: number;
  issueDate: string;
  issueTime: string;
  resultCode?: string | null;
}

export interface ClearanceStats {
  total: number;
  cleared: number;
  reported: number;
  pending: number;
  rejected: number;
  successRate: number; // percent, accepted (cleared+reported) / total
  nearDeadline: number; // simplified, not yet reported, 18-24h since issuance
  overdue: number; // simplified, not yet reported, >24h since issuance
  vatCollected: number;
}

const ACCEPTED = new Set(["cleared", "reported"]);
const REPORTED = new Set(["reported", "cleared", "rejected"]);

function hoursSince(issueDate: string, issueTime: string): number {
  const ts = Date.parse(`${issueDate}T${issueTime || "00:00:00"}`);
  if (Number.isNaN(ts)) return 0;
  return (Date.now() - ts) / 3_600_000;
}

/** Pure aggregation of a company's invoices into compliance-center numbers. */
export function computeClearanceStats(invoices: ClearanceInvoice[]): ClearanceStats {
  let cleared = 0, reported = 0, rejected = 0, pending = 0, vatCollected = 0;
  let nearDeadline = 0, overdue = 0;

  for (const inv of invoices) {
    if (inv.status === "cleared") cleared++;
    else if (inv.status === "reported") reported++;
    else if (inv.status === "rejected") rejected++;
    else pending++;

    if (ACCEPTED.has(inv.status)) vatCollected += inv.vatAmount;

    if (inv.kind === "simplified" && !REPORTED.has(inv.status)) {
      const h = hoursSince(inv.issueDate, inv.issueTime);
      if (h >= 24) overdue++;
      else if (h >= 18) nearDeadline++;
    }
  }

  const total = invoices.length;
  const successRate = total > 0 ? Math.round(((cleared + reported) / total) * 100) : 0;

  return { total, cleared, reported, pending, rejected, successRate, nearDeadline, overdue, vatCollected };
}

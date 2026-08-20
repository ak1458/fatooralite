import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { num } from "@/lib/db/decimal";
import { requirePermission } from "@/lib/auth/server";
import { riyadhToday } from "@/lib/time/riyadh";
import { sumNet } from "@/lib/zatca/reconciliation";

export const runtime = "nodejs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Resolve a `YYYY-MM` param (or the current month) to an inclusive-exclusive
 * `issueDate` range, as plain `YYYY-MM-DD` strings.
 *
 * These used to be `Date` objects built with `new Date(year, m, 1)`, which is
 * midnight in the *server's* timezone — so which VAT period an invoice fell
 * into depended on where the server happened to run. Invoice.issueDate is
 * stored as a `YYYY-MM-DD` string, and comparing strings sorts identically to
 * comparing the dates they denote, so this is timezone-free by construction.
 *
 * The DEFAULT month (no `month` param) is resolved in Asia/Riyadh, not UTC
 * or server-local (Phase 3 / W9) — issueDate itself is now stamped as a
 * Riyadh calendar day, so "this month" must mean the same thing. This only
 * changes which month is shown by default; an explicitly requested month's
 * figures, and the `cleared`/`reported` status filter, are unchanged (D1).
 */
function resolveMonth(month: string | null): { start: string; end: string; label: string } {
  const todayRiyadh = riyadhToday();
  let year = Number(todayRiyadh.slice(0, 4));
  let m = Number(todayRiyadh.slice(5, 7)) - 1;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, mm] = month.split("-").map(Number);
    year = y;
    m = mm - 1;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextYear = m === 11 ? year + 1 : year;
  const nextMonth = m === 11 ? 0 : m + 1;
  return {
    start: `${year}-${pad(m + 1)}-01`,
    end: `${nextYear}-${pad(nextMonth + 1)}-01`,
    label: `${MONTHS[m]} ${year}`,
  };
}

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const rangeDaysParam = searchParams.get("rangeDays");
  let start: string, end: string, label: string;
  if (rangeDaysParam && /^\d+$/.test(rangeDaysParam)) {
    const days = Math.min(parseInt(rangeDaysParam, 10), 366);
    const now = Date.now();
    // `end` is exclusive, so extend it to tomorrow to include today's invoices.
    // Riyadh calendar days (Phase 3 / W9), matching issueDate's own zone.
    end = riyadhToday(new Date(now + 86_400_000));
    start = riyadhToday(new Date(now - days * 86_400_000));
    label = `Last ${days} days`;
  } else {
    ({ start, end, label } = resolveMonth(searchParams.get("month")));
  }
  const format = searchParams.get("format");

  // D1 (docs/audit/decision-register.md): report BOTH figures, clearly
  // labelled, instead of one number that looks like a VAT return but is
  // silently "cleared by ZATCA only". "declarable" is every issued invoice
  // in the period (draft excluded) — the tax point per Saudi VAT time-of-
  // supply rules, which does not depend on clearance/reporting status.
  // "cleared" is the original cleared/reported-only figure, unchanged in
  // meaning, now explicitly labelled instead of implicitly presented as
  // the whole return. Filtered on issueDate, not createdAt: the VAT period
  // an invoice belongs to is decided by its issue date — the tax point —
  // not by when the row happened to be written. An invoice issued on 15
  // July and entered on 10 August was previously declared in August's
  // return and vanished from July's entirely, misstating both periods.
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { not: "draft" },
      issueDate: { gte: start, lt: end },
    },
    orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
  });
  const clearedInvoices = invoices.filter((inv) => inv.status === "cleared" || inv.status === "reported");

  // D9: sign-adjust credit/debit notes so a credit note reduces the total
  // instead of inflating it (docs/audit/decision-register.md D9, Option B).
  const toNetInput = (inv: (typeof invoices)[number]) => ({
    documentType: inv.documentType,
    taxableAmount: num(inv.taxableAmount),
    vatAmount: num(inv.vatAmount),
    grandTotal: num(inv.grandTotal),
  });
  const declarable = sumNet(invoices.map(toNetInput));
  const cleared = sumNet(clearedInvoices.map(toNetInput));

  if (format === "csv") {
    const header = ["Invoice Number", "Issue Date", "Type", "Buyer", "Buyer VAT", "Taxable", "VAT", "Grand Total", "Status"];
    const rows = invoices.map((inv) =>
      [
        inv.invoiceNumber,
        inv.issueDate,
        inv.documentType,
        inv.buyerName ?? "",
        inv.buyerVat ?? "",
        inv.taxableAmount.toFixed(2),
        inv.vatAmount.toFixed(2),
        inv.grandTotal.toFixed(2),
        inv.status,
      ].map(csvCell).join(","),
    );
    // Two labelled totals, not one — see the D1 comment above. Both are
    // net of credit/debit notes (D9), not a raw sum of the rows above.
    const declarableTotal = ["TOTAL — declarable (all issued, net of credit/debit notes)", "", "", "", "", declarable.taxableAmount.toFixed(2), declarable.vatAmount.toFixed(2), declarable.grandTotal.toFixed(2), ""].join(",");
    const clearedTotal = ["TOTAL — cleared by ZATCA only (net of credit/debit notes)", "", "", "", "", cleared.taxableAmount.toFixed(2), cleared.vatAmount.toFixed(2), cleared.grandTotal.toFixed(2), ""].join(",");
    const csv = [header.join(","), ...rows, declarableTotal, clearedTotal].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vat-return-${label.replace(/\s+/g, "-").toLowerCase()}.csv"`,
      },
    });
  }

  return NextResponse.json({
    // Legacy top-level fields — unchanged meaning (cleared/reported only,
    // now also D9-net-adjusted), kept for existing consumers. New code
    // should read `cleared`/`declarable` below instead of these directly.
    totalTaxable: cleared.taxableAmount,
    totalVat: cleared.vatAmount,
    totalInvoices: clearedInvoices.length,
    cleared: { totalTaxable: cleared.taxableAmount, totalVat: cleared.vatAmount, totalInvoices: clearedInvoices.length },
    declarable: { totalTaxable: declarable.taxableAmount, totalVat: declarable.vatAmount, totalInvoices: invoices.length },
    period: label,
  });
}

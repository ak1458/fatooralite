import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { num } from "@/lib/db/decimal";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `YYYY-MM-DD` for a Date, read in UTC. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve a `YYYY-MM` param (or the current month) to an inclusive-exclusive
 * `issueDate` range, as plain `YYYY-MM-DD` strings.
 *
 * These used to be `Date` objects built with `new Date(year, m, 1)`, which is
 * midnight in the *server's* timezone — so which VAT period an invoice fell
 * into depended on where the server happened to run. Invoice.issueDate is
 * stored as a `YYYY-MM-DD` string, and comparing strings sorts identically to
 * comparing the dates they denote, so this is timezone-free by construction.
 */
function resolveMonth(month: string | null): { start: string; end: string; label: string } {
  const now = new Date();
  let year = now.getUTCFullYear();
  let m = now.getUTCMonth();
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
    const now = new Date();
    // `end` is exclusive, so extend it to tomorrow to include today's invoices.
    end = isoDay(new Date(now.getTime() + 86_400_000));
    start = isoDay(new Date(now.getTime() - days * 86_400_000));
    label = `Last ${days} days`;
  } else {
    ({ start, end, label } = resolveMonth(searchParams.get("month")));
  }
  const format = searchParams.get("format");

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ["cleared", "reported"] },
      // Filtered on issueDate, not createdAt. The VAT period an invoice belongs
      // to is decided by its issue date — the tax point — not by when the row
      // happened to be written. An invoice issued on 15 July and entered on
      // 10 August was previously declared in August's return and vanished from
      // July's entirely, misstating both periods.
      issueDate: { gte: start, lt: end },
    },
    orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
  });

  const totalTaxable = invoices.reduce((sum, inv) => sum + num(inv.taxableAmount), 0);
  const totalVat = invoices.reduce((sum, inv) => sum + num(inv.vatAmount), 0);

  if (format === "csv") {
    const header = ["Invoice Number", "Issue Date", "Buyer", "Buyer VAT", "Taxable", "VAT", "Grand Total", "Status"];
    const rows = invoices.map((inv) =>
      [
        inv.invoiceNumber,
        inv.issueDate,
        inv.buyerName ?? "",
        inv.buyerVat ?? "",
        inv.taxableAmount.toFixed(2),
        inv.vatAmount.toFixed(2),
        inv.grandTotal.toFixed(2),
        inv.status,
      ].map(csvCell).join(","),
    );
    const totals = ["TOTAL", "", "", "", totalTaxable.toFixed(2), totalVat.toFixed(2), (totalTaxable + totalVat).toFixed(2), ""].join(",");
    const csv = [header.join(","), ...rows, totals].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vat-return-${label.replace(/\s+/g, "-").toLowerCase()}.csv"`,
      },
    });
  }

  return NextResponse.json({
    totalTaxable,
    totalVat,
    totalInvoices: invoices.length,
    period: label,
  });
}

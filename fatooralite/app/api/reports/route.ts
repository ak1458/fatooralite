import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Resolve a `YYYY-MM` param (or the current month) to a date range + label. */
function resolveMonth(month: string | null): { start: Date; end: Date; label: string } {
  const now = new Date();
  let year = now.getFullYear();
  let m = now.getMonth();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, mm] = month.split("-").map(Number);
    year = y;
    m = mm - 1;
  }
  return {
    start: new Date(year, m, 1),
    end: new Date(year, m + 1, 1),
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

  const { start, end, label } = resolveMonth(searchParams.get("month"));
  const format = searchParams.get("format");

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ["cleared", "reported"] },
      createdAt: { gte: start, lt: end },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalTaxable = invoices.reduce((sum, inv) => sum + inv.taxableAmount, 0);
  const totalVat = invoices.reduce((sum, inv) => sum + inv.vatAmount, 0);

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

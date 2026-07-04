import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { InvoiceTable } from "./InvoiceTable";
import type { Invoice } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Local fixtures — the component is presentational; real rows come from /api/invoices.
const rows: Invoice[] = [
  {
    num: "INV-2026-04417",
    customer: { en: "Buyer One", ar: "المشتري الأول" },
    amount: 128400,
    type: "standard",
    status: "cleared",
    uuid: "8b56cbc4…",
    result: "✓",
  },
  {
    num: "INV-2026-04413",
    customer: { en: "Buyer Two", ar: "المشتري الثاني" },
    amount: 5100,
    type: "simplified",
    status: "rejected",
    uuid: "77ac1f02…",
    result: "BR-KSA-83",
  },
];

describe("InvoiceTable", () => {
  it("renders a row per invoice with status + result", () => {
    render(
      <LangProvider initial="en">
        <InvoiceTable rows={rows} />
      </LangProvider>,
    );
    expect(screen.getByText("INV-2026-04417")).toBeTruthy();
    expect(screen.getByText("BR-KSA-83")).toBeTruthy(); // rejected result code
    expect(screen.getByText("SAR 128,400")).toBeTruthy(); // formatted amount
  });
});

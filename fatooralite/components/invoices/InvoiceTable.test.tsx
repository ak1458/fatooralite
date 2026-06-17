import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { InvoiceTable } from "./InvoiceTable";
import { invoices } from "@/data/invoices";

describe("InvoiceTable", () => {
  it("renders a row per invoice with status + result", () => {
    render(
      <LangProvider initial="en">
        <InvoiceTable rows={invoices} />
      </LangProvider>,
    );
    expect(screen.getByText("INV-2026-04417")).toBeTruthy();
    expect(screen.getByText("BR-KSA-83")).toBeTruthy(); // rejected result code
    expect(screen.getByText("SAR 128,400")).toBeTruthy(); // formatted amount
  });
});

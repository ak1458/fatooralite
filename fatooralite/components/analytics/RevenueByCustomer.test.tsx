import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { RevenueByCustomer } from "./RevenueByCustomer";

describe("RevenueByCustomer", () => {
  it("renders 5 ranked customers with values", () => {
    render(
      <LangProvider initial="en">
        <RevenueByCustomer />
      </LangProvider>,
    );
    expect(screen.getByText("Abdul Latif Jameel")).toBeTruthy();
    expect(screen.getByText("1.42M")).toBeTruthy();
    expect(screen.getByText("Panda Retail")).toBeTruthy();
  });
});

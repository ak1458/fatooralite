import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { SuccessDonut } from "./SuccessDonut";

describe("SuccessDonut", () => {
  it("renders the success percentage and legend counts", () => {
    render(
      <LangProvider initial="en">
        <SuccessDonut />
      </LangProvider>,
    );
    expect(screen.getByText("99.2%")).toBeTruthy();
    expect(screen.getByText("1,287")).toBeTruthy();
  });
});

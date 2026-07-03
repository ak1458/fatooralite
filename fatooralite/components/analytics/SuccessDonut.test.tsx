import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { SuccessDonut } from "./SuccessDonut";

describe("SuccessDonut", () => {
  it("renders the success percentage and legend counts from props", () => {
    render(
      <LangProvider initial="en">
        <SuccessDonut pct="92%" cleared={1287} pending={5} rejected={3} />
      </LangProvider>,
    );
    expect(screen.getByText("92%")).toBeTruthy();
    expect(screen.getByText("1,287")).toBeTruthy();
  });
});

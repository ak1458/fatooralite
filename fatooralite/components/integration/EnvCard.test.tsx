import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { EnvCard } from "./EnvCard";
import { environments } from "@/data/company";

describe("EnvCard", () => {
  it("renders host, latency and tag", () => {
    render(
      <LangProvider initial="en">
        <EnvCard env={environments[0]} />
      </LangProvider>,
    );
    expect(screen.getByText("api.zatca.gov.sa")).toBeTruthy();
    expect(screen.getByText("42ms")).toBeTruthy();
    expect(screen.getByText("PROD")).toBeTruthy();
  });
});

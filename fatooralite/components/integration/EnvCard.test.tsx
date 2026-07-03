import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { EnvCard } from "./EnvCard";
import type { EnvInfo } from "@/types";

// Local fixture — the component is presentational; real data comes from /api/integration.
const env: EnvInfo = {
  name: { en: "Production", ar: "بيئة الإنتاج" },
  host: "api.zatca.gov.sa",
  status: { en: "Connected", ar: "متصلة" },
  latency: "42ms",
  tag: "PROD",
  sub: "GZIP · PROD-CSID signed",
};

describe("EnvCard", () => {
  it("renders host, latency and tag", () => {
    render(
      <LangProvider initial="en">
        <EnvCard env={env} />
      </LangProvider>,
    );
    expect(screen.getByText("api.zatca.gov.sa")).toBeTruthy();
    expect(screen.getByText("42ms")).toBeTruthy();
    expect(screen.getByText("PROD")).toBeTruthy();
  });
});

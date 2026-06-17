import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavItem } from "./NavItem";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

describe("NavItem", () => {
  it("marks active when href matches pathname", () => {
    render(<NavItem href="/dashboard" icon="dashboard" label="Dashboard" />);
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link.getAttribute("data-active")).toBe("true");
  });
  it("is inactive when href differs", () => {
    render(<NavItem href="/invoices" icon="invoices" label="Invoices" />);
    const link = screen.getByRole("link", { name: /invoices/i });
    expect(link.getAttribute("data-active")).toBe("false");
  });
});

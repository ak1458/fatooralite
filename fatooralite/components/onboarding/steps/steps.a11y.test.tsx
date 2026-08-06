import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BusinessIdentityStep } from "./BusinessIdentityStep";
import { TaxRegistrationStep } from "./TaxRegistrationStep";
import { AddressContactStep } from "./AddressContactStep";
import type { Company } from "../types";

const company: Company = {
  id: "c1",
  name: "Acme Trading",
  nameAr: null,
  vatNumber: "300000000000003",
  crNumber: null,
  address: null,
  businessCategory: null,
  businessCategoryOther: null,
  crType: null,
  crIssueDate: null,
  crIssuePlace: null,
  vatRegistrationDate: null,
  economicActivity: null,
  buildingNumber: null,
  streetName: null,
  streetNameAr: null,
  district: null,
  districtAr: null,
  city: null,
  cityAr: null,
  postalCode: null,
  additionalNumber: null,
  province: null,
  countryCode: null,
  contactName: null,
  contactPhone: null,
  contactEmail: null,
  invoiceTypes: null,
  iban: null,
  bankName: null,
  onboardingStatus: "in_progress",
  onboardingStep: 0,
};

const noop = () => {};
const stepProps = { company, busy: false, onNext: noop, onBack: noop, errors: {}, setErrors: noop };

const STEPS = [
  ["BusinessIdentityStep", <BusinessIdentityStep key="bi" {...stepProps} />],
  ["TaxRegistrationStep", <TaxRegistrationStep key="tr" {...stepProps} />],
  ["AddressContactStep", <AddressContactStep key="ac" {...stepProps} />],
] as const;

describe.each(STEPS)("%s accessibility", (_name, element) => {
  it("gives every form control an accessible name", () => {
    const { container } = render(element);
    const controls = container.querySelectorAll("input, select, textarea");
    expect(controls.length).toBeGreaterThan(0);
    controls.forEach((c) => expect(c).toHaveAccessibleName());
  });

  it("associates every control with a label element via htmlFor", () => {
    const { container } = render(element);
    const labels = [...container.querySelectorAll("label")];
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((l) => {
      expect(l.htmlFor).not.toBe("");
      expect(container.querySelector(`#${CSS.escape(l.htmlFor)}`)).not.toBeNull();
    });
  });

  it("uses unique control ids", () => {
    const { container } = render(element);
    const ids = [...container.querySelectorAll("input, select, textarea")].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("step validation surfaces errors on the right field", () => {
  it("blocks Continue and reports invoiceTypes when it is not chosen", () => {
    let captured: Record<string, string> = {};
    let advanced = false;
    render(
      <TaxRegistrationStep
        company={{ ...company, vatRegistrationDate: "2020-02-01", economicActivity: "Retail" }}
        busy={false}
        onNext={() => {
          advanced = true;
        }}
        onBack={noop}
        errors={{}}
        setErrors={(e) => {
          captured = e;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(advanced).toBe(false);
    expect(Object.keys(captured)).toEqual(["invoiceTypes"]);
  });

  it("reports a malformed postal code against postalCode, not the first word of the message", () => {
    let captured: Record<string, string> = {};
    render(
      <AddressContactStep
        company={{
          ...company,
          buildingNumber: "1234",
          additionalNumber: "5678",
          streetName: "King Fahd Road",
          district: "Al Olaya",
          city: "Riyadh",
          postalCode: "123",
          contactName: "Sara",
          contactPhone: "+966501234567",
          contactEmail: "sara@acme.example",
        }}
        busy={false}
        onNext={noop}
        onBack={noop}
        errors={{}}
        setErrors={(e) => {
          captured = e;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(captured).toEqual({ postalCode: "Postal code is 5 digits" });
  });

  it("renders a returned error next to its own field", () => {
    render(<AddressContactStep {...stepProps} errors={{ postalCode: "Postal code is 5 digits" }} />);
    const control = screen.getByLabelText(/Postal code/);
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAccessibleDescription("Postal code is 5 digits");
  });
});

import { describe, it, expect } from "vitest";
import {
  blankToNull,
  validateAddressContact,
  validateBusinessIdentity,
  validateTaxRegistration,
} from "./validation";

const identity = {
  name: "Acme Trading",
  businessCategory: "retail",
  crNumber: "1010000001",
  crType: "CRN",
  crIssueDate: "2020-01-15",
};

const tax = {
  vatNumber: "300000000000003",
  vatRegistrationDate: "2020-02-01",
  economicActivity: "General retail trade",
  invoiceTypes: "both",
};

const address = {
  buildingNumber: "1234",
  additionalNumber: "6789",
  streetName: "King Fahd Road",
  district: "Al Olaya",
  city: "Riyadh",
  postalCode: "12345",
  contactName: "Sara Ahmed",
  contactPhone: "+966501234567",
  contactEmail: "sara@acme.example",
};

describe("validateBusinessIdentity", () => {
  it("accepts a complete step", () => {
    expect(validateBusinessIdentity(identity)).toBeNull();
  });

  it("rejects a missing business category instead of silently advancing", () => {
    expect(validateBusinessIdentity({ ...identity, businessCategory: null })?.field).toBe("businessCategory");
  });

  it("rejects a missing CR type", () => {
    expect(validateBusinessIdentity({ ...identity, crType: null })?.field).toBe("crType");
  });

  it("rejects a missing CR issue date", () => {
    expect(validateBusinessIdentity({ ...identity, crIssueDate: null })?.field).toBe("crIssueDate");
  });

  it("attributes a malformed CR number to crNumber", () => {
    expect(validateBusinessIdentity({ ...identity, crNumber: "101" })).toEqual({
      field: "crNumber",
      message: "CR number is 10 digits",
    });
  });

  it('requires a description when the category is "other"', () => {
    const err = validateBusinessIdentity({ ...identity, businessCategory: "other" });
    expect(err?.field).toBe("businessCategoryOther");
  });

  it('accepts "other" once described', () => {
    expect(
      validateBusinessIdentity({ ...identity, businessCategory: "other", businessCategoryOther: "Candle making" }),
    ).toBeNull();
  });
});

describe("validateTaxRegistration", () => {
  it("accepts a complete step", () => {
    expect(validateTaxRegistration(tax)).toBeNull();
  });

  // invoiceTypes is required to complete onboarding but was collected by no
  // step, so every fresh tenant was refused at the final click with an error
  // no screen could resolve.
  it("rejects a missing invoiceTypes", () => {
    expect(validateTaxRegistration({ ...tax, invoiceTypes: null })?.field).toBe("invoiceTypes");
  });

  it("rejects a malformed VAT registration date", () => {
    expect(validateTaxRegistration({ ...tax, vatRegistrationDate: "01-02-2020" })).toEqual({
      field: "vatRegistrationDate",
      message: "Use YYYY-MM-DD",
    });
  });

  it("rejects an empty economic activity", () => {
    expect(validateTaxRegistration({ ...tax, economicActivity: "" })?.field).toBe("economicActivity");
  });
});

describe("validateAddressContact", () => {
  it("accepts a complete step", () => {
    expect(validateAddressContact(address)).toBeNull();
  });

  // These three are the cases the old message.split(" ")[0] key derivation got
  // wrong — they keyed to "Postal", "Enter" and "Enter", so no field rendered
  // them and the step refused to advance with nothing on screen.
  it("attributes a bad postal code to postalCode", () => {
    expect(validateAddressContact({ ...address, postalCode: "123" })).toEqual({
      field: "postalCode",
      message: "Postal code is 5 digits",
    });
  });

  it("attributes a bad email to contactEmail", () => {
    expect(validateAddressContact({ ...address, contactEmail: "not-an-email" })).toEqual({
      field: "contactEmail",
      message: "Enter a valid email",
    });
  });

  it("attributes a bad phone to contactPhone", () => {
    expect(validateAddressContact({ ...address, contactPhone: "abc" })).toEqual({
      field: "contactPhone",
      message: "Enter a valid phone number",
    });
  });

  it("rejects a 5-digit building number", () => {
    expect(validateAddressContact({ ...address, buildingNumber: "12345" })?.field).toBe("buildingNumber");
  });

  it("rejects a missing additional number", () => {
    expect(validateAddressContact({ ...address, additionalNumber: "" })?.field).toBe("additionalNumber");
  });
});

describe("blankToNull", () => {
  it("maps empty and whitespace-only values to null and keeps the rest", () => {
    expect(blankToNull({ a: "", b: "   ", c: "kept" })).toEqual({ a: null, b: null, c: "kept" });
  });
});

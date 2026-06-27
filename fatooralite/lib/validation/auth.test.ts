import { describe, it, expect } from "vitest";
import { registerSchema } from "./schemas";

const valid = {
  name: "Ali Hassan",
  email: "ali@acme.com",
  password: "secret12",
  companyName: "Acme Trading",
  vatNumber: "300000000000003",
};

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a VAT number that is not 15 digits", () => {
    expect(registerSchema.safeParse({ ...valid, vatNumber: "12345" }).success).toBe(false);
  });

  it("rejects a missing company name", () => {
    expect(registerSchema.safeParse({ ...valid, companyName: "" }).success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./schemas";

const valid = {
  name: "Ali Hassan",
  email: "ali@acme.com",
  password: "secret12",
  companyName: "Acme Trading",
  vatNumber: "300000000000003",
  acceptedTerms: true,
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

  it("rejects registration without accepting terms", () => {
    const { acceptedTerms: _acceptedTerms, ...withoutTerms } = valid;
    expect(registerSchema.safeParse(withoutTerms).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, acceptedTerms: false }).success).toBe(false);
  });

  it("accepts registration with terms accepted", () => {
    expect(registerSchema.safeParse({ ...valid, acceptedTerms: true }).success).toBe(true);
  });
});

describe("email normalisation", () => {
  it("lower-cases the address on registration", () => {
    const parsed = registerSchema.parse({ ...valid, email: "Owner@Example.COM" });
    expect(parsed.email).toBe("owner@example.com");
  });

  it("trims surrounding whitespace instead of failing validation", () => {
    const parsed = registerSchema.parse({ ...valid, email: "  ali@acme.com  " });
    expect(parsed.email).toBe("ali@acme.com");
  });

  it("normalises the login address the same way, so sign-in is case-insensitive", () => {
    const parsed = loginSchema.parse({ email: "Owner@Example.COM", password: "anything" });
    expect(parsed.email).toBe("owner@example.com");
  });

  it("still rejects a non-string email rather than passing it to the database", () => {
    // {"email":{"contains":"@"}} used to reach Prisma as a where clause and
    // surface as a 500 on the login endpoint.
    expect(loginSchema.safeParse({ email: { contains: "@" }, password: "x" }).success).toBe(false);
  });

  it("requires a password to be present at login", () => {
    expect(loginSchema.safeParse({ email: "ali@acme.com", password: "" }).success).toBe(false);
  });
});

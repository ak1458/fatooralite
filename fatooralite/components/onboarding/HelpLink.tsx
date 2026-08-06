"use client";

import React from "react";

const helpLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ac)",
  background: "var(--acs)",
  border: "1px solid var(--ac)",
  cursor: "pointer",
  textDecoration: "none",
  lineHeight: 1,
  fontFamily: "inherit",
  transition: "opacity 0.15s",
};

interface HelpLinkProps {
  slug: string;
  label?: string;
  /** Set false only for an in-app help route; every current use is the external docs site. */
  external?: boolean;
}

export function HelpLink({ slug, label, external = true }: HelpLinkProps) {
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://arranto.com/support/fatoora-lite-pro";
  const href = `${baseUrl}#${slug}`;

  return (
    <a
      href={href}
      target={external ? "_blank" : "_self"}
      rel={external ? "noopener noreferrer" : undefined}
      style={helpLinkStyle}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      title={`Help: ${label || slug}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      {label || "Help"}
    </a>
  );
}

export const HelpLinks = {
  businessCategory: () => <HelpLink slug="business-category" label="Business category" />,
  businessCategoryOther: () => <HelpLink slug="business-category-other" label="Other category" />,
  crNumber: () => <HelpLink slug="cr-number" label="CR number" />,
  crType: () => <HelpLink slug="cr-type" label="CR type" />,
  crIssueDate: () => <HelpLink slug="cr-issue-date" label="CR issue date" />,
  crIssuePlace: () => <HelpLink slug="cr-issue-place" label="CR issue place" />,
  vatNumber: () => <HelpLink slug="vat-number" label="VAT number" />,
  vatRegistrationDate: () => <HelpLink slug="vat-registration-date" label="VAT registration date" />,
  economicActivity: () => <HelpLink slug="economic-activity" label="Economic activity" />,
  buildingNumber: () => <HelpLink slug="building-number" label="Building number" />,
  streetName: () => <HelpLink slug="street-name" label="Street name" />,
  streetNameAr: () => <HelpLink slug="street-name-ar" label="Street name (Arabic)" />,
  additionalNumber: () => <HelpLink slug="additional-number" label="Additional number" />,
  district: () => <HelpLink slug="district" label="District" />,
  districtAr: () => <HelpLink slug="district-ar" label="District (Arabic)" />,
  city: () => <HelpLink slug="city" label="City" />,
  cityAr: () => <HelpLink slug="city-ar" label="City (Arabic)" />,
  postalCode: () => <HelpLink slug="postal-code" label="Postal code" />,
  province: () => <HelpLink slug="province" label="Province" />,
  countryCode: () => <HelpLink slug="country-code" label="Country code" />,
  nationalAddress: () => <HelpLink slug="national-address" label="National address" />,
  contactPerson: () => <HelpLink slug="contact-person" label="Contact person" />,
  contactName: () => <HelpLink slug="contact-name" label="Contact name" />,
  contactPhone: () => <HelpLink slug="contact-phone" label="Contact phone" />,
  contactEmail: () => <HelpLink slug="contact-email" label="Contact email" />,
  invoiceTypes: () => <HelpLink slug="invoice-types" label="Invoice types" />,
  iban: () => <HelpLink slug="iban" label="IBAN" />,
  bankName: () => <HelpLink slug="bank-name" label="Bank name" />,
  zatcaOtp: () => <HelpLink slug="zatca-otp" label="ZATCA OTP" />,
  branch: () => <HelpLink slug="branches" label="Branches" />,
};
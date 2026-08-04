"use client";

import { useState } from "react";
import { blankToNull, validateAddressContact } from "@/lib/onboarding/validation";
import { HelpLinks } from "../HelpLink";
import { Field } from "../Field";
import { StepNav } from "../StepNav";
import { StepTitle } from "../WizardChrome";
import { groupHeading, input, readOnlyInput, row, section } from "../styles";
import type { StepProps } from "../types";

export function AddressContactStep({ company, busy, onNext, onBack, errors, setErrors }: StepProps) {
  const [buildingNumber, setBuildingNumber] = useState(company.buildingNumber ?? "");
  const [streetName, setStreetName] = useState(company.streetName ?? "");
  const [streetNameAr, setStreetNameAr] = useState(company.streetNameAr ?? "");
  const [district, setDistrict] = useState(company.district ?? "");
  const [districtAr, setDistrictAr] = useState(company.districtAr ?? "");
  const [city, setCity] = useState(company.city ?? "");
  const [cityAr, setCityAr] = useState(company.cityAr ?? "");
  const [postalCode, setPostalCode] = useState(company.postalCode ?? "");
  const [additionalNumber, setAdditionalNumber] = useState(company.additionalNumber ?? "");
  const [province, setProvince] = useState(company.province ?? "");
  const [contactName, setContactName] = useState(company.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(company.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(company.contactEmail ?? "");
  const countryCode = company.countryCode ?? "SA";

  const handleNext = () => {
    const data = blankToNull({
      buildingNumber,
      additionalNumber,
      streetName,
      streetNameAr,
      district,
      districtAr,
      city,
      cityAr,
      postalCode,
      province,
      contactName,
      contactPhone,
      contactEmail,
    });
    const err = validateAddressContact(data);
    if (err) {
      setErrors({ [err.field]: err.message });
      return;
    }
    setErrors({});
    onNext({ ...data, countryCode });
  };

  return (
    <div>
      <StepTitle
        title="Address & contact"
        sub="Saudi national address and primary contact person"
        help={<HelpLinks.nationalAddress />}
      />

      <div style={section}>
        <h2 style={groupHeading}>
          National address <HelpLinks.nationalAddress />
        </h2>

        <div style={row}>
          <Field
            id="addr-building"
            label="Building number"
            required
            help={<HelpLinks.buildingNumber />}
            error={errors.buildingNumber}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                value={buildingNumber}
                onChange={(e) => setBuildingNumber(e.target.value)}
                placeholder="1234"
                maxLength={4}
                inputMode="numeric"
              />
            )}
          </Field>

          <Field
            id="addr-additional"
            label="Additional number"
            required
            help={<HelpLinks.additionalNumber />}
            error={errors.additionalNumber}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                value={additionalNumber}
                onChange={(e) => setAdditionalNumber(e.target.value)}
                placeholder="5678"
                maxLength={4}
                inputMode="numeric"
              />
            )}
          </Field>
        </div>

        <div style={row}>
          <Field
            id="addr-street"
            label="Street name"
            required
            help={<HelpLinks.streetName />}
            error={errors.streetName}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="King Fahd Road"
                maxLength={150}
              />
            )}
          </Field>

          <Field id="addr-street-ar" label="Street name (Arabic)" help={<HelpLinks.streetNameAr />}>
            {(p) => (
              <input
                {...p}
                dir="rtl"
                style={input}
                value={streetNameAr}
                onChange={(e) => setStreetNameAr(e.target.value)}
                placeholder="طريق الملك فهد"
                maxLength={150}
              />
            )}
          </Field>
        </div>

        <div style={row}>
          <Field id="addr-district" label="District" required help={<HelpLinks.district />} error={errors.district}>
            {(p) => (
              <input
                {...p}
                style={input}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Al Olaya"
                maxLength={100}
              />
            )}
          </Field>

          <Field id="addr-district-ar" label="District (Arabic)" help={<HelpLinks.districtAr />}>
            {(p) => (
              <input
                {...p}
                dir="rtl"
                style={input}
                value={districtAr}
                onChange={(e) => setDistrictAr(e.target.value)}
                placeholder="العليا"
                maxLength={100}
              />
            )}
          </Field>
        </div>

        <div style={row}>
          <Field id="addr-city" label="City" required help={<HelpLinks.city />} error={errors.city}>
            {(p) => (
              <input
                {...p}
                style={input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Riyadh"
                maxLength={100}
              />
            )}
          </Field>

          <Field id="addr-city-ar" label="City (Arabic)" help={<HelpLinks.cityAr />}>
            {(p) => (
              <input
                {...p}
                dir="rtl"
                style={input}
                value={cityAr}
                onChange={(e) => setCityAr(e.target.value)}
                placeholder="الرياض"
                maxLength={100}
              />
            )}
          </Field>
        </div>

        <div style={row}>
          <Field
            id="addr-postal"
            label="Postal code"
            required
            help={<HelpLinks.postalCode />}
            error={errors.postalCode}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="12345"
                maxLength={5}
                inputMode="numeric"
              />
            )}
          </Field>

          <Field id="addr-province" label="Province" help={<HelpLinks.province />}>
            {(p) => (
              <input
                {...p}
                style={input}
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Riyadh"
                maxLength={100}
              />
            )}
          </Field>
        </div>

        <div style={{ marginBottom: 13 }}>
          <Field
            id="addr-country"
            label="Country"
            help={<HelpLinks.countryCode />}
            hint="Fixed to SA (Saudi Arabia)"
          >
            {(p) => <input {...p} style={{ ...readOnlyInput, width: 80 }} value={countryCode} readOnly />}
          </Field>
        </div>
      </div>

      <div style={section}>
        <h2 style={groupHeading}>
          Contact person <HelpLinks.contactPerson />
        </h2>

        <div style={row}>
          <Field
            id="contact-name"
            label="Contact name"
            required
            help={<HelpLinks.contactName />}
            error={errors.contactName}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Sara Ahmed"
                maxLength={100}
              />
            )}
          </Field>

          <Field
            id="contact-phone"
            label="Phone"
            required
            help={<HelpLinks.contactPhone />}
            error={errors.contactPhone}
          >
            {(p) => (
              <input
                {...p}
                type="tel"
                style={input}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+966501234567"
                maxLength={20}
              />
            )}
          </Field>
        </div>

        <div style={{ marginBottom: 13 }}>
          <Field
            id="contact-email"
            label="Email"
            required
            help={<HelpLinks.contactEmail />}
            error={errors.contactEmail}
          >
            {(p) => (
              <input
                {...p}
                style={input}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="sara@company.sa"
                maxLength={200}
              />
            )}
          </Field>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={handleNext} busy={busy} />
    </div>
  );
}

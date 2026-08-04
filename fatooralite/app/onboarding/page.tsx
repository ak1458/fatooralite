"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ONBOARDING_STEPS, getStepByOrder, getStepKeys, getNextStep, getPrevStep, BUSINESS_CATEGORY_OPTIONS, CR_TYPE_OPTIONS, INVOICE_TYPES_OPTIONS } from "@/lib/onboarding/steps";
import { zatcaMandatoryCompanySchema } from "@/lib/validation/schemas";
import { HelpLink, HelpLinks } from "@/components/onboarding/HelpLink";
import type { OnboardingStepConfig } from "@/lib/onboarding/steps";

type Company = {
  id: string;
  name: string;
  nameAr: string | null;
  vatNumber: string;
  crNumber: string | null;
  address: string | null;
  businessCategory: string | null;
  businessCategoryOther: string | null;
  crType: string | null;
  crIssueDate: string | null;
  crIssuePlace: string | null;
  vatRegistrationDate: string | null;
  economicActivity: string | null;
  buildingNumber: string | null;
  streetName: string | null;
  streetNameAr: string | null;
  district: string | null;
  districtAr: string | null;
  city: string | null;
  cityAr: string | null;
  postalCode: string | null;
  additionalNumber: string | null;
  province: string | null;
  countryCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  invoiceTypes: string | null;
  iban: string | null;
  bankName: string | null;
  onboardingStatus: string;
  onboardingStep: number;
};

type Branch = { id: string; name: string; city: string | null };

const STEP_KEYS = getStepKeys();

const input: React.CSSProperties = {
  width: "100%", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--bd)",
  background: "var(--s2)", color: "var(--tx)", fontSize: 14, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};
const label: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 };
const primaryBtn: React.CSSProperties = {
  padding: "11px 20px", borderRadius: 11, border: "none",
  background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d",
  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  padding: "11px 18px", borderRadius: 11, border: "1px solid var(--bd)",
  background: "var(--s1)", color: "var(--t2)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const section: React.CSSProperties = { marginBottom: 18 };
const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 };
const row3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 13 };
const errorText: React.CSSProperties = { fontSize: 11.5, color: "var(--dang)", marginTop: 3 };

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
    {children}
  </div>
);

const Stepper = ({ currentStepKey }: { currentStepKey: string }) => {
  const currentIdx = STEP_KEYS.indexOf(currentStepKey as any);
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 18, justifyContent: "center", flexWrap: "wrap" }}>
      {ONBOARDING_STEPS.map((s, i) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26, height: 26, borderRadius: "50%", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: i <= currentIdx ? "linear-gradient(150deg,var(--acb),var(--ac))" : "var(--s2)",
              color: i <= currentIdx ? "#04130d" : "var(--t3)",
              border: i <= currentIdx ? "none" : "1px solid var(--bd)",
            }}
          >
            {i + 1}
          </div>
          <span style={{ fontSize: 12.5, color: i === currentIdx ? "var(--tx)" : "var(--t3)", fontWeight: i === currentIdx ? 600 : 500 }}>
            {s.label}
          </span>
          {i < ONBOARDING_STEPS.length - 1 && <span style={{ width: 18, height: 1, background: "var(--bd)" }} />}
        </div>
      ))}
    </div>
  );
};

const StepTitle = ({ title, sub, help }: { title: string; sub: string; help?: React.ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{title}</h1>
        <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{sub}</div>
      </div>
      {help && <div style={{ alignSelf: "flex-start" }}>{help}</div>}
    </div>
  </div>
);

async function patchCompany(companyId: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/companies/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Could not save");
  return res.json();
}

function validateBusinessIdentity(data: Record<string, unknown>) {
  const result = zatcaMandatoryCompanySchema.shape.businessCategory.safeParse(data.businessCategory);
  if (!result.success && data.businessCategory) return result.error.issues[0].message;
  if (data.businessCategory === "other" && (!data.businessCategoryOther || typeof data.businessCategoryOther !== "string" || !data.businessCategoryOther.trim())) return 'Describe the business category when selecting "Other"';
  const crResult = zatcaMandatoryCompanySchema.shape.crNumber.safeParse(data.crNumber);
  if (!crResult.success) return "CR number is 10 digits";
  if (data.crType && !["CRN", "MOM", "MLS", "SAG", "700", "OTH"].includes(data.crType as string)) return "Invalid CR type";
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (data.crIssueDate && !dateRegex.test(data.crIssueDate as string)) return "Use YYYY-MM-DD";
  return null;
}

function validateTaxRegistration(data: Record<string, unknown>) {
  const vatResult = zatcaMandatoryCompanySchema.shape.vatNumber.safeParse(data.vatNumber);
  if (!vatResult.success) return "VAT must be exactly 15 digits";
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (data.vatRegistrationDate && !dateRegex.test(data.vatRegistrationDate as string)) return "Use YYYY-MM-DD";
  if (!data.economicActivity || typeof data.economicActivity !== "string" || !data.economicActivity.trim()) return "Economic activity is required";
  return null;
}

function validateAddressContact(data: Record<string, unknown>) {
  const required4 = ["buildingNumber", "additionalNumber", "postalCode"];
  for (const f of required4) {
    const val = data[f] as string;
    if (!val || !/^\d{4}$/.test(val) && f !== "postalCode") return `${f} is 4 digits`;
    if (f === "postalCode" && (!val || !/^\d{5}$/.test(val))) return "Postal code is 5 digits";
  }
  const required = ["streetName", "district", "city", "contactName", "contactPhone", "contactEmail"];
  for (const f of required) {
    const val = data[f];
    if (!val || typeof val !== "string" || !val.trim()) return `${f} is required`;
  }
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail as string)) return "Enter a valid email";
  if (data.contactPhone && !/^\+?\d{7,15}$/.test(data.contactPhone as string)) return "Enter a valid phone number";
  return null;
}

const BusinessIdentityStep = ({
  company, busy, onNext, onBack, errors, setErrors,
}: { company: Company; busy: boolean; onNext: (d: Record<string, unknown>) => void; onBack: () => void; errors: Record<string, string>; setErrors: (e: Record<string, string>) => void }) => {
  const [nameAr, setNameAr] = useState(company.nameAr ?? "");
  const [crNumber, setCrNumber] = useState(company.crNumber ?? "");
  const [businessCategory, setBusinessCategory] = useState(company.businessCategory ?? "");
  const [businessCategoryOther, setBusinessCategoryOther] = useState(company.businessCategoryOther ?? "");
  const [crType, setCrType] = useState(company.crType ?? "");
  const [crIssueDate, setCrIssueDate] = useState(company.crIssueDate ?? "");
  const [crIssuePlace, setCrIssuePlace] = useState(company.crIssuePlace ?? "");

  const handleNext = () => {
    const data = { nameAr: nameAr || null, crNumber: crNumber || null, businessCategory: businessCategory || null, businessCategoryOther: businessCategoryOther || null, crType: crType || null, crIssueDate: crIssueDate || null, crIssuePlace: crIssuePlace || null };
    const err = validateBusinessIdentity(data);
    if (err) { setErrors({ ...errors, businessCategory: err }); return; }
    setErrors({});
    onNext(data);
  };

  return (
    <div>
      <StepTitle title="Business identity" sub="Legal name, category, and commercial registration for ZATCA compliance" help={<HelpLinks.businessCategory />} />

      <div style={section}>
        <label style={label}>Legal name (English)</label>
        <input style={{ ...input, opacity: 0.7 }} value={company.name} readOnly />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>Set during registration — contact support to change</div>
      </div>

      <div style={section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={label}>Name (Arabic)</label>
          <HelpLinks.businessCategory />
        </div>
        <input dir="rtl" style={input} value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="اسم الشركة بالعربية" />
        {errors.nameAr && <div style={errorText}>{errors.nameAr}</div>}
      </div>

      <div style={section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={label}>VAT number</label>
          <HelpLinks.vatNumber />
        </div>
        <input style={{ ...input, opacity: 0.7, fontFamily: "var(--fmono)" }} value={company.vatNumber} readOnly />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>Verified during registration</div>
      </div>

      <div style={row}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>Business category <span style={{ color: "var(--dang)" }}>*</span></label>
            <HelpLinks.businessCategory />
          </div>
          <select style={input} value={businessCategory} onChange={(e) => { setBusinessCategory(e.target.value); if (e.target.value !== "other") setBusinessCategoryOther(""); }}>
            <option value="">Select category</option>
            {BUSINESS_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.value === "other" ? "Other (specify below)" : c.labelEn}</option>
            ))}
          </select>
          {errors.businessCategory && <div style={errorText}>{errors.businessCategory}</div>}
        </div>
        <div>
          <label style={label}>CR number <span style={{ color: "var(--dang)" }}>*</span></label>
          <input style={input} value={crNumber} onChange={(e) => setCrNumber(e.target.value)} placeholder="1010000001" maxLength={10} />
          {errors.crNumber && <div style={errorText}>{errors.crNumber}</div>}
        </div>
      </div>

      {businessCategory === "other" && (
        <div style={section}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>Describe your business category <span style={{ color: "var(--dang)" }}>*</span></label>
            <HelpLinks.businessCategoryOther />
          </div>
          <input style={input} value={businessCategoryOther} onChange={(e) => setBusinessCategoryOther(e.target.value)} placeholder="E.g., Artisan candle making" maxLength={200} />
          {errors.businessCategoryOther && <div style={errorText}>{errors.businessCategoryOther}</div>}
        </div>
      )}

      <div style={row}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>CR type <span style={{ color: "var(--dang)" }}>*</span></label>
            <HelpLinks.crType />
          </div>
          <select style={input} value={crType} onChange={(e) => setCrType(e.target.value)}>
            <option value="">Select CR type</option>
            {CR_TYPE_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.value} — {c.label}</option>)}
          </select>
          {errors.crType && <div style={errorText}>{errors.crType}</div>}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>CR issue date <span style={{ color: "var(--dang)" }}>*</span></label>
            <HelpLinks.crIssueDate />
          </div>
          <input style={input} type="date" value={crIssueDate} onChange={(e) => setCrIssueDate(e.target.value)} />
          {errors.crIssueDate && <div style={errorText}>{errors.crIssueDate}</div>}
        </div>
      </div>

      <div style={section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={label}>CR issue place <span style={{ color: "var(--dang)" }}>*</span></label>
          <HelpLinks.crIssuePlace />
        </div>
        <input style={input} value={crIssuePlace} onChange={(e) => setCrIssuePlace(e.target.value)} placeholder="Riyadh" maxLength={100} />
        {errors.crIssuePlace && <div style={errorText}>{errors.crIssuePlace}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <button style={ghostBtn} onClick={onBack} disabled={busy}>Back</button>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={handleNext}>Continue</button>
      </div>
    </div>
  );
};

const TaxRegistrationStep = ({
  company, busy, onNext, onBack, errors, setErrors,
}: { company: Company; busy: boolean; onNext: (d: Record<string, unknown>) => void; onBack: () => void; errors: Record<string, string>; setErrors: (e: Record<string, string>) => void }) => {
  const [vatRegistrationDate, setVatRegistrationDate] = useState(company.vatRegistrationDate ?? "");
  const [economicActivity, setEconomicActivity] = useState(company.economicActivity ?? "");

  const handleNext = () => {
    const data = { vatNumber: company.vatNumber, vatRegistrationDate: vatRegistrationDate || null, economicActivity: economicActivity || null };
    const err = validateTaxRegistration(data);
    if (err) { setErrors({ ...errors, vatRegistrationDate: err }); return; }
    setErrors({});
    onNext({ vatRegistrationDate: vatRegistrationDate || null, economicActivity: economicActivity || null });
  };

  return (
    <div>
      <StepTitle title="Tax registration" sub="VAT number, registration date, and economic activity" help={<HelpLinks.vatRegistrationDate />} />

      <div style={section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={label}>VAT number</label>
          <HelpLinks.vatNumber />
        </div>
        <input style={{ ...input, opacity: 0.7, fontFamily: "var(--fmono)" }} value={company.vatNumber} readOnly />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>15 digits, verified at registration</div>
      </div>

      <div style={row}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>VAT registration date <span style={{ color: "var(--dang)" }}>*</span></label>
            <HelpLinks.vatRegistrationDate />
          </div>
          <input style={input} type="date" value={vatRegistrationDate} onChange={(e) => setVatRegistrationDate(e.target.value)} />
          {errors.vatRegistrationDate && <div style={errorText}>{errors.vatRegistrationDate}</div>}
        </div>
        <div>
          <label style={label}>Economic activity <span style={{ color: "var(--dang)" }}>*</span></label>
          <input style={input} value={economicActivity} onChange={(e) => setEconomicActivity(e.target.value)} placeholder="General retail trade" maxLength={200} />
          {errors.economicActivity && <div style={errorText}>{errors.economicActivity}</div>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <button style={ghostBtn} onClick={onBack} disabled={busy}>Back</button>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={handleNext}>Continue</button>
      </div>
    </div>
  );
};

const AddressContactStep = ({
  company, busy, onNext, onBack, errors, setErrors,
}: { company: Company; busy: boolean; onNext: (d: Record<string, unknown>) => void; onBack: () => void; errors: Record<string, string>; setErrors: (e: Record<string, string>) => void }) => {
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
  const [countryCode] = useState(company.countryCode ?? "SA");
  const [contactName, setContactName] = useState(company.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(company.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(company.contactEmail ?? "");

  const handleNext = () => {
    const data = {
      buildingNumber, additionalNumber, streetName, streetNameAr, district, districtAr, city, cityAr, postalCode, province, countryCode,
      contactName, contactPhone, contactEmail,
    };
    const err = validateAddressContact(data);
    if (err) { setErrors({ ...errors, [err.split(" ")[0]]: err }); return; }
    setErrors({});
    onNext({
      buildingNumber: buildingNumber || null, additionalNumber: additionalNumber || null,
      streetName: streetName || null, streetNameAr: streetNameAr || null,
      district: district || null, districtAr: districtAr || null,
      city: city || null, cityAr: cityAr || null,
      postalCode: postalCode || null,
      province: province || null, countryCode: countryCode || null,
      contactName: contactName || null, contactPhone: contactPhone || null, contactEmail: contactEmail || null,
    });
  };

  return (
    <div>
      <StepTitle title="Address & contact" sub="Saudi national address and primary contact person" help={<HelpLinks.nationalAddress />} />

      <div style={section}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--tx)" }}>National address <HelpLinks.nationalAddress /></div>

        <div style={row}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Building number <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.buildingNumber />
            </div>
            <input style={input} value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} placeholder="1234" maxLength={4} />
            {errors.buildingNumber && <div style={errorText}>{errors.buildingNumber}</div>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Additional number <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.additionalNumber />
            </div>
            <input style={input} value={additionalNumber} onChange={(e) => setAdditionalNumber(e.target.value)} placeholder="5678" maxLength={4} />
            {errors.additionalNumber && <div style={errorText}>{errors.additionalNumber}</div>}
          </div>
        </div>

        <div style={row}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Street name <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.streetName />
            </div>
            <input style={input} value={streetName} onChange={(e) => setStreetName(e.target.value)} placeholder="King Fahd Road" maxLength={150} />
            {errors.streetName && <div style={errorText}>{errors.streetName}</div>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Street name (Arabic)</label>
              <HelpLinks.streetNameAr />
            </div>
            <input dir="rtl" style={input} value={streetNameAr} onChange={(e) => setStreetNameAr(e.target.value)} placeholder="طريق الملك فهد" maxLength={150} />
          </div>
        </div>

        <div style={row}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>District <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.district />
            </div>
            <input style={input} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Al Olaya" maxLength={100} />
            {errors.district && <div style={errorText}>{errors.district}</div>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>District (Arabic)</label>
              <HelpLinks.districtAr />
            </div>
            <input dir="rtl" style={input} value={districtAr} onChange={(e) => setDistrictAr(e.target.value)} placeholder="العليا" maxLength={100} />
          </div>
        </div>

        <div style={row}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>City <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.city />
            </div>
            <input style={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Riyadh" maxLength={100} />
            {errors.city && <div style={errorText}>{errors.city}</div>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>City (Arabic)</label>
              <HelpLinks.cityAr />
            </div>
            <input dir="rtl" style={input} value={cityAr} onChange={(e) => setCityAr(e.target.value)} placeholder="الرياض" maxLength={100} />
          </div>
        </div>

        <div style={row}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Postal code <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.postalCode />
            </div>
            <input style={input} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="12345" maxLength={5} />
            {errors.postalCode && <div style={errorText}>{errors.postalCode}</div>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Province</label>
              <HelpLinks.province />
            </div>
            <input style={input} value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Riyadh" maxLength={100} />
          </div>
        </div>

        <div style={{ marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>Country</label>
            <HelpLinks.countryCode />
          </div>
          <input style={{ ...input, opacity: 0.7, width: "80px" }} value={countryCode} readOnly />
          <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>Fixed to SA (Saudi Arabia)</div>
        </div>
      </div>

      <div style={section}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--tx)" }}>Contact person <HelpLinks.contactPerson /></div>

        <div style={row}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Contact name <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.contactName />
            </div>
            <input style={input} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Sara Ahmed" maxLength={100} />
            {errors.contactName && <div style={errorText}>{errors.contactName}</div>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={label}>Phone <span style={{ color: "var(--dang)" }}>*</span></label>
              <HelpLinks.contactPhone />
            </div>
            <input style={input} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+966 50 123 4567" maxLength={20} />
            {errors.contactPhone && <div style={errorText}>{errors.contactPhone}</div>}
          </div>
        </div>

        <div style={{ marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={label}>Email <span style={{ color: "var(--dang)" }}>*</span></label>
            <HelpLinks.contactEmail />
          </div>
          <input style={input} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="sara@company.sa" maxLength={200} />
          {errors.contactEmail && <div style={errorText}>{errors.contactEmail}</div>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <button style={ghostBtn} onClick={onBack} disabled={busy}>Back</button>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={handleNext}>Continue</button>
      </div>
    </div>
  );
};

const PROGRESS_STEPS = [
  { at: 0, label: "Requesting certificate…" },
  { at: 2500, label: "Running compliance checks…" },
  { at: 6000, label: "Activating production CSID…" },
];

const ZatcaStep = ({
  company, busy, onSkip, onConnected, setError, setBusy,
}: { company: Company; busy: boolean; onSkip: () => void; onConnected: () => void; setError: (s: string) => void; setBusy: (b: boolean) => void }) => {
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
  const [otp, setOtp] = useState("");
  const [progress, setProgress] = useState("");

  const connect = async () => {
    if (!otp.trim()) { setError("Enter the OTP from the ZATCA Fatoora portal, or skip for now."); return; }
    setBusy(true); setError(""); setProgress(PROGRESS_STEPS[0].label);
    const timers = PROGRESS_STEPS.slice(1).map((s) => setTimeout(() => setProgress(s.label), s.at));
    try {
      const res = await fetch("/api/onboarding/activate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, otp, mode }),
      });
      const data = await res.json();
      if (!res.ok || data.step !== "done") {
        const stepLabel = data.step === "compliance" ? "Compliance checks" : "Certificate request";
        throw new Error(data.error ? `${stepLabel}: ${data.error}` : "ZATCA onboarding failed");
      }
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZATCA onboarding failed");
      setBusy(false);
    } finally {
      timers.forEach(clearTimeout);
      setProgress("");
    }
  };

  return (
    <div>
      <StepTitle title="Connect to ZATCA" sub="Onboard your device to clear & report invoices. You can also do this later." help={<HelpLinks.zatcaOtp />} />
      <div style={{ marginBottom: 14 }}>
        <label style={label}>Environment</label>
        <div style={{ display: "flex", gap: 10 }}>
          {(["sandbox", "production"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex: 1, padding: "10px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13,
                border: mode === m ? "1px solid var(--ac)" : "1px solid var(--bd)",
                background: mode === m ? "var(--acs)" : "var(--s2)", color: mode === m ? "var(--ac)" : "var(--t2)",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={label}>ZATCA portal OTP</label>
        <input style={{ ...input, fontFamily: "var(--fmono)" }} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
        <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 6 }}>
          Get this from the ZATCA Fatoora portal (Onboard new solution). No OTP yet? Skip and connect from Settings later.
        </div>
        {progress && <div style={{ fontSize: 12.5, color: "var(--ac)", marginTop: 8, fontWeight: 600 }}>{progress}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <button style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={onSkip}>Skip for now</button>
        <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={connect}>
          {busy ? (progress || "Connecting…") : "Connect"}
        </button>
      </div>
    </div>
  );
};

const BranchStep = ({
  company, branches, busy, reload, onBack, onNext, setError,
}: { company: Company; branches: Branch[]; busy: boolean; reload: () => void; onBack: () => void; onNext: () => void; setError: (s: string) => void }) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!name.trim()) { setError("Branch name is required."); return; }
    setAdding(true); setError("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, name, city: city || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not add branch");
      setName(""); setCity(""); reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add branch"); }
    finally { setAdding(false); }
  };

  return (
    <div>
      <StepTitle title="Locations" sub="Add at least one branch/location. Invoices are issued per location." help={<HelpLinks.branch />} />
      {branches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {branches.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderRadius: 11, background: "var(--s2)", border: "1px solid var(--bd)" }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{b.name}</span>
              <span style={{ color: "var(--t3)", fontSize: 13 }}>{b.city || "—"}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: 10, marginBottom: 18, alignItems: "end" }}>
        <div>
          <label style={label}>Branch name</label>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Riyadh HQ" />
        </div>
        <div>
          <label style={label}>City</label>
          <input style={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Riyadh" />
        </div>
        <button style={{ ...ghostBtn, opacity: adding ? 0.6 : 1 }} disabled={adding} onClick={add}>Add</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={ghostBtn} onClick={onBack}>Back</button>
        <button style={{ ...primaryBtn, opacity: branches.length === 0 || busy ? 0.5 : 1 }} disabled={branches.length === 0 || busy} onClick={onNext}>Continue</button>
      </div>
    </div>
  );
};

const FinishStep = ({
  company, branches, busy, onBack, onFinish,
}: { company: Company; branches: Branch[]; busy: boolean; onBack: () => void; onFinish: () => void }) => (
  <div>
    <StepTitle title="You're ready" sub="Review and enter your dashboard." />
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      <Row k="Company" v={company.name} />
      <Row k="VAT number" v={company.vatNumber} />
      <Row k="Business category" v={company.businessCategory ? BUSINESS_CATEGORY_OPTIONS.find(c => c.value === company.businessCategory)?.labelEn || company.businessCategory : "—"} />
      <Row k="Locations" v={branches.map((b) => b.name).join(", ") || "—"} />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <button style={ghostBtn} onClick={onBack}>Back</button>
      <button style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={onFinish}>
        {busy ? "Finishing…" : "Go to dashboard"}
      </button>
    </div>
  </div>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderRadius: 11, background: "var(--s2)", border: "1px solid var(--bd)" }}>
    <span style={{ color: "var(--t3)", fontSize: 13 }}>{k}</span>
    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{v}</span>
  </div>
);

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reopenParam = searchParams.get("reopen");
  const stepParam = searchParams.get("step");

  const [company, setCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const loadBranches = useCallback(async (companyId: string) => {
    const d = await fetch(`/api/branches?companyId=${companyId}`).then((r) => r.json()).catch(() => ({ branches: [] }));
    setBranches(d.branches ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (me) => {
        if (!me?.company) { router.replace("/login"); return; }
        
        let comp = me.company;
        let initialIdx = 0;

        if (reopenParam === "true" || reopenParam === "1") {
          try {
            comp = await patchCompany(me.company.id, { onboardingStatus: "in_progress", onboardingStep: 0 });
          } catch {
            comp = me.company;
          }
          initialIdx = 0;
        } else if (stepParam && STEP_KEYS.includes(stepParam as any) && comp.onboardingStatus === "complete") {
          // Deep-link is edit-mode only (Settings -> "Edit this step"). A
          // pending/in_progress company must NOT be able to jump straight to
          // e.g. ?step=finish and mark itself complete without ever passing
          // the validated steps 1-3 — that would skip every ZATCA-mandatory
          // field this wizard exists to collect.
          initialIdx = STEP_KEYS.indexOf(stepParam as any);
        } else {
          if (comp.onboardingStatus === "complete") { router.replace("/dashboard"); return; }
          initialIdx = Math.min(comp.onboardingStep ?? 0, STEP_KEYS.length - 1);
        }

        setCompany(comp);
        setStepIdx(initialIdx);
        await loadBranches(comp.id);
      })
      .finally(() => setLoading(false));
  }, [router, loadBranches, reopenParam, stepParam]);

  const advance = async (toIdx: number, extra: Record<string, unknown> = {}) => {
    setBusy(true); setError("");
    try {
      const updated = await patchCompany(company!.id, { onboardingStep: toIdx, onboardingStatus: "in_progress", ...extra });
      setCompany(updated);
      setStepIdx(toIdx);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  const getStepComponent = () => {
    const stepKey = STEP_KEYS[stepIdx];
    if (!company) return null;

    switch (stepKey) {
      case "business-identity":
        return <BusinessIdentityStep company={company} busy={busy} onNext={(d) => advance(stepIdx + 1, d)} onBack={() => setStepIdx(stepIdx - 1)} errors={stepErrors} setErrors={setStepErrors} />;
      case "tax-registration":
        return <TaxRegistrationStep company={company} busy={busy} onNext={(d) => advance(stepIdx + 1, d)} onBack={() => setStepIdx(stepIdx - 1)} errors={stepErrors} setErrors={setStepErrors} />;
      case "address-contact":
        return <AddressContactStep company={company} busy={busy} onNext={(d) => advance(stepIdx + 1, d)} onBack={() => setStepIdx(stepIdx - 1)} errors={stepErrors} setErrors={setStepErrors} />;
      case "zatca-connection":
        return <ZatcaStep company={company} busy={busy} onSkip={() => advance(stepIdx + 1)} onConnected={() => advance(stepIdx + 1)} setError={setError} setBusy={setBusy} />;
      case "branches":
        return <BranchStep company={company} branches={branches} busy={busy} reload={() => loadBranches(company.id)} onBack={() => setStepIdx(stepIdx - 1)} onNext={() => advance(stepIdx + 1)} setError={setError} />;
      case "finish":
        return <FinishStep company={company} branches={branches} busy={busy} onBack={() => setStepIdx(stepIdx - 1)} onFinish={async () => {
          setBusy(true); setError("");
          try {
            await fetch("/api/onboarding/local-cert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: company.id }) });
            await patchCompany(company.id, { onboardingStatus: "complete", onboardingStep: STEP_KEYS.length });
            router.push("/dashboard");
            router.refresh();
          } catch (e) { setError(e instanceof Error ? e.message : "Could not finish"); setBusy(false); }
        }} />;
      default:
        return null;
    }
  };

  if (loading) return <Centered><div style={{ color: "var(--t3)" }}>Loading…</div></Centered>;
  if (!company) return null;

  return (
    <Centered>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <Stepper currentStepKey={STEP_KEYS[stepIdx]} />
        <div style={{ borderRadius: 18, border: "1px solid var(--bd)", background: "var(--s1)", boxShadow: "var(--sh)", padding: 28 }}>
          {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 14 }}>{error}</div>}
          {getStepComponent()}
        </div>
      </div>
    </Centered>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Centered><div style={{ color: "var(--t3)" }}>Loading…</div></Centered>}>
      <OnboardingContent />
    </Suspense>
  );
}
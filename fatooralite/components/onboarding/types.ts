/** Company shape as returned by `/api/auth/me` and `PATCH /api/companies/[id]`. */
export interface Company {
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
}

export interface Branch {
  id: string;
  name: string;
  city: string | null;
}

/** Props every data-collecting step receives from the wizard shell. */
export interface StepProps {
  company: Company;
  busy: boolean;
  /** Persists the step's fields and advances. */
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

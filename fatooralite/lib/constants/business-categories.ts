/**
 * Business-category taxonomy for the onboarding wizard's business-info step.
 * Plain codes, not a DB enum — adding a category is a code change, not a
 * migration, and each entry carries bilingual labels the enum can't.
 * "other" always requires Company.businessCategoryOther (see lib/validation/schemas.ts).
 */
export interface BusinessCategory {
  code: string;
  labelEn: string;
  labelAr: string;
}

export const BUSINESS_CATEGORIES: readonly BusinessCategory[] = [
  { code: "retail", labelEn: "Retail & Trade", labelAr: "التجزئة والتجارة" },
  { code: "restaurant_cafe", labelEn: "Restaurant / Café", labelAr: "مطعم / مقهى" },
  { code: "professional_services", labelEn: "Professional Services", labelAr: "خدمات مهنية" },
  { code: "construction_contracting", labelEn: "Construction & Contracting", labelAr: "المقاولات والإنشاءات" },
  { code: "healthcare", labelEn: "Healthcare", labelAr: "الرعاية الصحية" },
  { code: "education", labelEn: "Education & Training", labelAr: "التعليم والتدريب" },
  { code: "transport_logistics", labelEn: "Transport & Logistics", labelAr: "النقل والخدمات اللوجستية" },
  { code: "manufacturing", labelEn: "Manufacturing & Industry", labelAr: "التصنيع والصناعة" },
  { code: "wholesale_trade", labelEn: "Wholesale Trade", labelAr: "تجارة الجملة" },
  { code: "real_estate", labelEn: "Real Estate", labelAr: "العقارات" },
  { code: "technology_it", labelEn: "Technology & IT", labelAr: "التقنية وتكنولوجيا المعلومات" },
  { code: "hospitality_tourism", labelEn: "Hospitality & Tourism", labelAr: "الضيافة والسياحة" },
  { code: "agriculture", labelEn: "Agriculture & Food Production", labelAr: "الزراعة والإنتاج الغذائي" },
  { code: "other", labelEn: "Other", labelAr: "أخرى" },
] as const;

export const BUSINESS_CATEGORY_CODES = BUSINESS_CATEGORIES.map((c) => c.code) as [string, ...string[]];

export function isBusinessCategoryCode(value: string): boolean {
  return BUSINESS_CATEGORIES.some((c) => c.code === value);
}

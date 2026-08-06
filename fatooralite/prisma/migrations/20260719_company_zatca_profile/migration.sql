-- AlterTable: expand Company with the ZATCA-mandatory business-profile
-- fields collected by the onboarding wizard's business-info step
-- (docs/12-master-roadmap.md §3.1). All additive and nullable — existing
-- rows are unaffected.
ALTER TABLE "Company"
  ADD COLUMN     "businessCategory" TEXT,
  ADD COLUMN     "businessCategoryOther" TEXT,
  ADD COLUMN     "crType" TEXT,
  ADD COLUMN     "crIssueDate" TEXT,
  ADD COLUMN     "crIssuePlace" TEXT,
  ADD COLUMN     "vatRegistrationDate" TEXT,
  ADD COLUMN     "economicActivity" TEXT,
  ADD COLUMN     "buildingNumber" TEXT,
  ADD COLUMN     "streetName" TEXT,
  ADD COLUMN     "streetNameAr" TEXT,
  ADD COLUMN     "district" TEXT,
  ADD COLUMN     "districtAr" TEXT,
  ADD COLUMN     "city" TEXT,
  ADD COLUMN     "cityAr" TEXT,
  ADD COLUMN     "postalCode" TEXT,
  ADD COLUMN     "additionalNumber" TEXT,
  ADD COLUMN     "province" TEXT,
  ADD COLUMN     "countryCode" TEXT DEFAULT 'SA',
  ADD COLUMN     "contactName" TEXT,
  ADD COLUMN     "contactPhone" TEXT,
  ADD COLUMN     "contactEmail" TEXT,
  ADD COLUMN     "invoiceTypes" TEXT,
  ADD COLUMN     "iban" TEXT,
  ADD COLUMN     "bankName" TEXT;

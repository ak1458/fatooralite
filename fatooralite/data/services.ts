import type { Service } from "@/types";

/** ZATCA integration service health. Reporting API is degraded in this snapshot. */
export const services: Service[] = [
  { name: { en: "CSID Issuance", ar: "إصدار CSID" }, ok: true },
  { name: { en: "Cryptographic Stamp", ar: "الختم التشفيري" }, ok: true },
  { name: { en: "XML Validation", ar: "التحقق من XML" }, ok: true },
  { name: { en: "QR Generation", ar: "توليد QR" }, ok: true },
  { name: { en: "Clearance API", ar: "واجهة الإجازة" }, ok: true },
  { name: { en: "Reporting API", ar: "واجهة الإبلاغ" }, ok: "degraded" },
  { name: { en: "Sandbox Env", ar: "بيئة الاختبار" }, ok: true },
  { name: { en: "Production Env", ar: "بيئة الإنتاج" }, ok: true },
];

import type { AiInsight, AiMessage, Bilingual } from "@/types";

export const aiMessages: AiMessage[] = [
  {
    role: "user",
    text: {
      en: "Why was invoice INV-2026-04413 for Mobily rejected?",
      ar: "لماذا رُفضت الفاتورة INV-2026-04413 الخاصة بموبايلي؟",
    },
  },
  {
    role: "assistant",
    text: {
      en: 'It was rejected with BR-KSA-83: the VAT category code does not match the applied rate. Line 3 is marked "Exempt" but carries 15%. Set the category code to "S" (Standard) and resubmit — I can prepare the corrected XML.',
      ar: 'رُفضت بالخطأ BR-KSA-83: رمز فئة ضريبة القيمة المضافة لا يطابق النسبة المطبّقة. البند ٣ مُعلّم «معفى» لكنه يحمل نسبة ١٥٪. صحّح رمز الفئة إلى «S» (قياسي) وأعد الإرسال — يمكنني تجهيز ملف XML المصحّح.',
    },
  },
];

export const aiPrompts: Bilingual[] = [
  { en: "Explain Phase 2 requirements", ar: "اشرح متطلبات المرحلة ٢" },
  { en: "Audit this month invoices", ar: "دقّق فواتير هذا الشهر" },
  { en: "Summarize rejection reasons", ar: "لخّص أسباب الرفض" },
  { en: "Forecast next quarter VAT", ar: "تنبّأ بضريبة الربع القادم" },
];

export const aiInsights: AiInsight[] = [
  {
    tag: { en: "Risk", ar: "خطر" },
    tone: "warn",
    title: { en: "3 invoices near reporting deadline", ar: "٣ فواتير تقترب من مهلة الإبلاغ" },
    body: { en: "Must be reported within 19 hours", ar: "يجب الإبلاغ خلال ١٩ ساعة" },
  },
  {
    tag: { en: "Anomaly", ar: "شذوذ" },
    tone: "info",
    title: { en: "Unusual spike in invoice amounts", ar: "ارتفاع غير معتاد في قيم الفواتير" },
    body: { en: "34% above 30-day average", ar: "أعلى بنسبة ٣٤٪ من متوسط ٣٠ يومًا" },
  },
  {
    tag: { en: "Tip", ar: "توصية" },
    tone: "ac",
    title: { en: "Certificate renewal scheduled", ar: "تجديد الشهادة مُجدول" },
    body: { en: "Auto-renews in 247 days", ar: "تجديد تلقائي خلال ٢٤٧ يومًا" },
  },
];

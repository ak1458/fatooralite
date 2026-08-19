/**
 * N7 — minimal bilingual (Arabic + English) invoice-delivery email. No i18n
 * machinery: both languages in one body, same convention as the ZATCA QR/PDF
 * carrying both scripts.
 */

export interface InvoiceEmailData {
  invoiceNumber: string;
  sellerName: string;
  grandTotal: string; // pre-formatted, e.g. "115.00"
}

export function invoiceEmailSubject(data: InvoiceEmailData): string {
  return `Invoice ${data.invoiceNumber} from ${data.sellerName} — فاتورة ${data.invoiceNumber}`;
}

export function invoiceEmailHtml(data: InvoiceEmailData): string {
  return `
    <div style="font-family:sans-serif;font-size:14px;color:#111;line-height:1.6">
      <p>You have received a new invoice from <strong>${escapeHtml(data.sellerName)}</strong>.</p>
      <p>
        Invoice number: <strong>${escapeHtml(data.invoiceNumber)}</strong><br/>
        Total: <strong>SAR ${escapeHtml(data.grandTotal)}</strong>
      </p>
      <p>The invoice PDF is attached to this email.</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
      <p dir="rtl" style="text-align:right">
        لقد استلمت فاتورة جديدة من <strong>${escapeHtml(data.sellerName)}</strong>.<br/>
        رقم الفاتورة: <strong>${escapeHtml(data.invoiceNumber)}</strong><br/>
        الإجمالي: <strong>${escapeHtml(data.grandTotal)} ريال سعودي</strong>
      </p>
      <p dir="rtl" style="text-align:right">فاتورة PDF مرفقة بهذا البريد الإلكتروني.</p>
    </div>
  `.trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

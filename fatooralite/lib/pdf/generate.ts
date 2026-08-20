import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { Invoice, InvoiceLine } from "@prisma/client";
import { num } from "@/lib/db/decimal";
import { embedInvoiceFonts, type InvoiceFonts } from "./fonts";
import { visualRuns, type TextRun } from "./bidi";

export interface PdfSeller {
  name: string;
  vatNumber: string;
  nameAr?: string | null;
  address?: string | null;
}

export interface PdfOptions {
  xml?: string;
  seller?: PdfSeller;
  lines?: InvoiceLine[];
}

const INK = rgb(0.1, 0.12, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.85, 0.87, 0.9);

/**
 * Characters WinAnsi encodes above U+00FF. Helvetica can render these; anything
 * else outside Latin-1 cannot go through the standard faces and must use the
 * embedded Unicode font instead.
 */
const WINANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function isWinAnsiSafe(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x20) return false;
    if (cp <= 0xff) continue;
    if (!WINANSI_EXTRA.has(cp)) return false;
  }
  return true;
}

interface DrawOpts {
  size?: number;
  bold?: boolean;
  color?: typeof INK;
}

/**
 * Render a ZATCA-presentable invoice PDF: header, seller/buyer blocks, a line
 * item table, totals, and — critically — the TLV QR code ZATCA requires on any
 * printed or PDF invoice. The signed XML is embedded for PDF/A-3 association.
 *
 * Arabic is rendered with an embedded OpenType face (see ./fonts.ts) and laid
 * out run by run (see ./bidi.ts). Before that, any Arabic character anywhere in
 * an invoice — a buyer's name was enough — aborted generation with
 * "WinAnsi cannot encode", so a signed, numbered invoice could never be printed
 * or sent. Characters are always rendered as written: nothing here substitutes,
 * transliterates or drops a character it cannot draw.
 */
export async function generatePdf(invoice: Invoice, options: PdfOptions = {}): Promise<Uint8Array> {
  const { xml = invoice.xml ?? undefined, seller, lines = [] } = options;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const fonts = await embedInvoiceFonts(pdfDoc);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  /** The face that can actually draw this run. */
  const fontFor = (run: TextRun, bold: boolean): PDFFont => {
    if (run.rtl || !isWinAnsiSafe(run.text)) return bold ? fonts.arabicBold : fonts.arabic;
    return bold ? fonts.latinBold : fonts.latin;
  };

  const measure = (s: string, opts: DrawOpts = {}): number => {
    const size = opts.size ?? 10;
    let total = 0;
    for (const run of visualRuns(s)) {
      total += fontFor(run, opts.bold ?? false).widthOfTextAtSize(run.text, size);
    }
    return total;
  };

  /**
   * Draw a string at (x, yy), placing each direction run in visual order.
   * A single drawText call cannot do this: fontkit applies one direction to the
   * whole string, which reverses a Latin word inside an Arabic phrase and
   * leaves an Arabic word inside an English phrase unreversed.
   */
  const text = (s: string, x: number, yy: number, opts: DrawOpts = {}) => {
    const size = opts.size ?? 10;
    const bold = opts.bold ?? false;
    let cx = x;
    for (const run of visualRuns(s)) {
      const font = fontFor(run, bold);
      page.drawText(run.text, { x: cx, y: yy, size, font, color: opts.color ?? INK });
      cx += font.widthOfTextAtSize(run.text, size);
    }
  };

  const rightText = (s: string, rightX: number, yy: number, opts: DrawOpts = {}) => {
    text(s, rightX - measure(s, opts), yy, opts);
  };

  /** English label with its Arabic equivalent beneath, for the fixed chrome. */
  const label = (en: string, ar: string, x: number, yy: number) => {
    text(en, x, yy, { size: 8, color: MUTED });
    text(ar, x, yy - 9, { size: 8, color: MUTED });
  };

  // --- Header --------------------------------------------------------------
  const isCredit = invoice.documentType === "credit";
  const isDebit = invoice.documentType === "debit";
  const titleEn = isCredit ? "Credit Note" : isDebit ? "Debit Note" : "Tax Invoice";
  const titleAr = isCredit ? "إشعار دائن" : isDebit ? "إشعار مدين" : "فاتورة ضريبية";
  text(titleEn, margin, y - 8, { size: 20, bold: true });
  text(titleAr, margin, y - 30, { size: 15, bold: true });

  rightText(seller?.name ?? "Seller", width - margin, y - 2, { size: 13, bold: true });
  let sellerY = y - 18;
  if (seller?.nameAr) {
    rightText(seller.nameAr, width - margin, sellerY, { size: 12, bold: true });
    sellerY -= 15;
  }
  if (seller?.vatNumber) {
    rightText(`VAT / الرقم الضريبي: ${seller.vatNumber}`, width - margin, sellerY, { size: 9, color: MUTED });
    sellerY -= 13;
  }
  if (seller?.address) {
    rightText(seller.address, width - margin, sellerY, { size: 9, color: MUTED });
  }
  y -= 56;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: RULE });
  y -= 26;

  // --- Meta + buyer --------------------------------------------------------
  label("Invoice Number", "رقم الفاتورة", margin, y);
  text(invoice.invoiceNumber, margin, y - 22, { size: 11, bold: true });
  label("Issue Date", "تاريخ الإصدار", margin + 180, y);
  text(`${invoice.issueDate} ${invoice.issueTime}`, margin + 180, y - 22, { size: 11 });
  label("Type", "النوع", margin + 360, y);
  text(invoice.kind === "simplified" ? "Simplified" : "Standard", margin + 360, y - 22, { size: 11 });
  y -= 46;

  label("Bill To", "فاتورة إلى", margin, y);
  text(invoice.buyerName || "N/A", margin, y - 22, { size: 11, bold: true });
  if (invoice.buyerVat) {
    text(`VAT / الرقم الضريبي: ${invoice.buyerVat}`, margin + 180, y - 22, { size: 10, color: MUTED });
  }
  y -= 48;

  // --- Line items ----------------------------------------------------------
  const cols = { desc: margin, qty: 330, unit: 400, total: width - margin };
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: width - margin * 2,
    height: 30,
    color: rgb(0.96, 0.97, 0.98),
  });
  const headCell = (en: string, ar: string, x: number, right: boolean) => {
    const draw = right ? rightText : text;
    draw(en, x, y, { size: 8, bold: true, color: MUTED });
    draw(ar, x, y - 10, { size: 8, bold: true, color: MUTED });
  };
  headCell("Description", "الوصف", cols.desc + 6, false);
  headCell("Qty", "الكمية", cols.qty, true);
  headCell("Unit", "سعر الوحدة", cols.unit, true);
  headCell("Amount", "المبلغ", cols.total, true);
  y -= 30;

  const rows = lines.length
    ? lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: num(l.unitPrice), netAmount: num(l.netAmount) }))
    : [{ description: "—", quantity: 0, unitPrice: 0, netAmount: num(invoice.taxableAmount) }];
  for (const l of rows) {
    // Truncate by characters, never by bytes — slicing a string mid-codepoint
    // would corrupt an Arabic description rather than shorten it.
    text([...l.description].slice(0, 60).join(""), cols.desc + 6, y, { size: 9 });
    rightText(String(l.quantity), cols.qty, y, { size: 9 });
    rightText(l.unitPrice.toFixed(2), cols.unit, y, { size: 9 });
    rightText(l.netAmount.toFixed(2), cols.total, y, { size: 9 });
    y -= 17;
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.5, color: RULE });
  }
  y -= 14;

  // --- Totals --------------------------------------------------------------
  const totalsRight = width - margin;
  const totalsLabel = totalsRight - 210;
  const totalLine = (en: string, ar: string, value: string, strong = false) => {
    text(`${en} / ${ar}`, totalsLabel, y, { size: strong ? 11 : 10, bold: strong, color: strong ? INK : MUTED });
    rightText(`SAR ${value}`, totalsRight, y, { size: strong ? 12 : 10, bold: strong });
    y -= strong ? 20 : 16;
  };
  totalLine("Taxable Amount", "المبلغ الخاضع للضريبة", invoice.taxableAmount.toFixed(2));
  totalLine("VAT (15%)", "ضريبة القيمة المضافة", invoice.vatAmount.toFixed(2));
  totalLine("Grand Total", "الإجمالي", invoice.grandTotal.toFixed(2), true);

  // --- ZATCA QR code -------------------------------------------------------
  if (invoice.qr) {
    await drawQr(pdfDoc, page, invoice.qr, margin, margin + 20);
    text("Scan to verify (ZATCA)", margin, margin + 6, { size: 7.5, color: MUTED });
    text("امسح للتحقق", margin, margin - 4, { size: 7.5, color: MUTED });
  }

  // --- Embed XML for PDF/A-3 association -----------------------------------
  if (xml) {
    await pdfDoc.attach(Buffer.from(xml, "utf8"), `invoice_${invoice.invoiceNumber}.xml`, {
      mimeType: "text/xml",
      description: "ZATCA E-Invoice XML",
      creationDate: new Date(),
      modificationDate: new Date(),
    });
  }
  pdfDoc.setTitle(`Invoice ${invoice.invoiceNumber}`);
  pdfDoc.setProducer("Fatoora Lite Pro");

  return pdfDoc.save();
}

/** Encode the base64 TLV string as a QR PNG and draw it onto the page. */
async function drawQr(
  pdfDoc: PDFDocument,
  page: PDFPage,
  qrPayload: string,
  x: number,
  y: number,
): Promise<void> {
  const dataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 });
  const pngBytes = Buffer.from(dataUrl.split(",")[1], "base64");
  const png = await pdfDoc.embedPng(pngBytes);
  const size = 96;
  page.drawImage(png, { x, y, width: size, height: size });
}

export type { InvoiceFonts };

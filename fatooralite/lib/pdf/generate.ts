import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { Invoice, InvoiceLine } from "@prisma/client";

export interface PdfSeller {
  name: string;
  vatNumber: string;
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
 * Render a ZATCA-presentable invoice PDF: header, seller/buyer blocks, a line
 * item table, totals, and — critically — the TLV QR code ZATCA requires on any
 * printed or PDF invoice. The signed XML is embedded for PDF/A-3 association.
 */
export async function generatePdf(invoice: Invoice, options: PdfOptions = {}): Promise<Uint8Array> {
  const { xml = invoice.xml ?? undefined, seller, lines = [] } = options;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: PDFFont; color?: typeof INK } = {},
  ) => {
    page.drawText(s, {
      x,
      y: yy,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? INK,
    });
  };

  const rightText = (
    s: string,
    rightX: number,
    yy: number,
    opts: { size?: number; font?: PDFFont; color?: typeof INK } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    text(s, rightX - f.widthOfTextAtSize(s, size), yy, opts);
  };

  // --- Header --------------------------------------------------------------
  text(invoice.documentType === "credit" ? "Credit Note" : "Tax Invoice", margin, y - 8, {
    size: 22,
    font: bold,
  });
  rightText(seller?.name ?? "Seller", width - margin, y - 2, { size: 13, font: bold });
  if (seller?.vatNumber) {
    rightText(`VAT: ${seller.vatNumber}`, width - margin, y - 18, { size: 9, color: MUTED });
  }
  if (seller?.address) {
    rightText(seller.address, width - margin, y - 31, { size: 9, color: MUTED });
  }
  y -= 48;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: RULE });
  y -= 22;

  // --- Meta + buyer --------------------------------------------------------
  text("Invoice Number", margin, y, { size: 8, color: MUTED });
  text(invoice.invoiceNumber, margin, y - 13, { size: 11, font: bold });
  text("Issue Date", margin + 180, y, { size: 8, color: MUTED });
  text(`${invoice.issueDate} ${invoice.issueTime}`, margin + 180, y - 13, { size: 11 });
  text("Type", margin + 360, y, { size: 8, color: MUTED });
  text(invoice.kind === "simplified" ? "Simplified" : "Standard", margin + 360, y - 13, { size: 11 });
  y -= 36;

  text("Bill To", margin, y, { size: 8, color: MUTED });
  text(invoice.buyerName || "N/A", margin, y - 13, { size: 11, font: bold });
  if (invoice.buyerVat) {
    text(`VAT: ${invoice.buyerVat}`, margin + 180, y - 13, { size: 10, color: MUTED });
  }
  y -= 38;

  // --- Line items ----------------------------------------------------------
  const cols = { desc: margin, qty: 330, unit: 400, total: width - margin };
  page.drawRectangle({
    x: margin,
    y: y - 6,
    width: width - margin * 2,
    height: 22,
    color: rgb(0.96, 0.97, 0.98),
  });
  text("Description", cols.desc + 6, y, { size: 8, font: bold, color: MUTED });
  rightText("Qty", cols.qty, y, { size: 8, font: bold, color: MUTED });
  rightText("Unit", cols.unit, y, { size: 8, font: bold, color: MUTED });
  rightText("Amount", cols.total, y, { size: 8, font: bold, color: MUTED });
  y -= 22;

  const rows = lines.length
    ? lines
    : ([{ description: "—", quantity: 0, unitPrice: 0, netAmount: invoice.taxableAmount, vatAmount: invoice.vatAmount }] as InvoiceLine[]);
  for (const l of rows) {
    text(l.description.slice(0, 60), cols.desc + 6, y, { size: 9 });
    rightText(String(l.quantity), cols.qty, y, { size: 9 });
    rightText(l.unitPrice.toFixed(2), cols.unit, y, { size: 9 });
    rightText(l.netAmount.toFixed(2), cols.total, y, { size: 9 });
    y -= 17;
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.5, color: RULE });
  }
  y -= 14;

  // --- Totals --------------------------------------------------------------
  const totalsRight = width - margin;
  const totalsLabel = totalsRight - 150;
  const totalLine = (label: string, value: string, strong = false) => {
    text(label, totalsLabel, y, { size: strong ? 11 : 10, font: strong ? bold : font, color: strong ? INK : MUTED });
    rightText(`SAR ${value}`, totalsRight, y, { size: strong ? 12 : 10, font: strong ? bold : font });
    y -= strong ? 20 : 16;
  };
  totalLine("Taxable Amount", invoice.taxableAmount.toFixed(2));
  totalLine("VAT (15%)", invoice.vatAmount.toFixed(2));
  totalLine("Grand Total", invoice.grandTotal.toFixed(2), true);

  // --- ZATCA QR code -------------------------------------------------------
  if (invoice.qr) {
    await drawQr(pdfDoc, page, invoice.qr, margin, margin + 20);
    text("Scan to verify (ZATCA)", margin, margin + 6, { size: 7.5, color: MUTED });
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
  pdfDoc.setProducer("FatooraLite");

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

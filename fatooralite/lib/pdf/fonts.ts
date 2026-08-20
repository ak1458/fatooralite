import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

/**
 * Font set for invoice rendering.
 *
 * Latin text keeps the WinAnsi standard faces it always used, so English
 * invoices render byte-for-byte as before. Arabic — which WinAnsi cannot encode
 * at all — gets Amiri, an OFL-licensed Naskh face covering both Arabic and
 * Latin, embedded through fontkit so pdf-lib runs the OpenType shaper and
 * resolves joining forms and ligatures.
 *
 * Using two families rather than one is deliberate: rendering the whole document
 * in Amiri would change every existing English invoice, and the audit's
 * requirement was to add Arabic without regressing English.
 */
export interface InvoiceFonts {
  latin: PDFFont;
  latinBold: PDFFont;
  arabic: PDFFont;
  arabicBold: PDFFont;
}

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

// Read once per process. The files are ~430 KB each and never change at
// runtime; re-reading them per invoice would be pure waste on a warm instance.
let cached: { regular: Buffer; bold: Buffer } | null = null;

async function loadArabicFontBytes(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (cached) return cached;
  const [regular, bold] = await Promise.all([
    readFile(path.join(FONT_DIR, "Amiri-Regular.ttf")),
    readFile(path.join(FONT_DIR, "Amiri-Bold.ttf")),
  ]);
  cached = { regular, bold };
  return cached;
}

/**
 * Register fontkit on the document and embed every face the invoice may need.
 *
 * `subset: true` keeps only the glyphs actually drawn, so embedding a 6,710-glyph
 * face does not put half a megabyte into every PDF.
 */
export async function embedInvoiceFonts(pdfDoc: PDFDocument): Promise<InvoiceFonts> {
  pdfDoc.registerFontkit(fontkit);
  const bytes = await loadArabicFontBytes();
  const [latin, latinBold, arabic, arabicBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(bytes.regular, { subset: true }),
    pdfDoc.embedFont(bytes.bold, { subset: true }),
  ]);
  return { latin, latinBold, arabic, arabicBold };
}

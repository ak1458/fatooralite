import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { InvoiceInput, PostalAddress, TaxSubtotal } from "./types";
import { invoiceTotals, lineNet, lineVat, effectiveRate } from "./money";

const TYPE_CODE: Record<string, string> = {
  invoice: "388",
  credit: "381",
  debit: "383",
};

/** Build a postal address block under the given parent element. */
function buildAddress(parent: XMLBuilder, addr: PostalAddress | undefined) {
  const a = parent.ele("cac:PostalAddress");
  a.ele("cbc:StreetName").txt(addr?.streetName ?? "").up();
  if (addr?.buildingNumber) {
    a.ele("cbc:BuildingNumber").txt(addr.buildingNumber).up();
  }
  if (addr?.plotIdentification) {
    a.ele("cbc:PlotIdentification").txt(addr.plotIdentification).up();
  }
  if (addr?.citySubdivision) {
    a.ele("cbc:CitySubdivisionName").txt(addr.citySubdivision).up();
  }
  a.ele("cbc:CityName").txt(addr?.cityName ?? "").up();
  a.ele("cbc:PostalZone").txt(addr?.postalZone ?? "").up();
  if (addr?.countrySubentity) {
    a.ele("cbc:CountrySubentity").txt(addr.countrySubentity).up();
  }
  a.ele("cac:Country")
    .ele("cbc:IdentificationCode")
    .txt(addr?.countryCode ?? "SA")
    .up()
    .up();
  a.up();
}

/** Build a TaxSubtotal element for a single tax category. */
function buildTaxSubtotal(parent: XMLBuilder, sub: TaxSubtotal) {
  const ts = parent.ele("cac:TaxSubtotal");
  ts.ele("cbc:TaxableAmount", { currencyID: "SAR" }).txt(sub.taxableAmount.toFixed(2)).up();
  ts.ele("cbc:TaxAmount", { currencyID: "SAR" }).txt(sub.taxAmount.toFixed(2)).up();
  const cat = ts.ele("cac:TaxCategory");
  cat.ele("cbc:ID").txt(sub.taxCategory).up();
  cat.ele("cbc:Percent").txt(sub.percent.toFixed(2)).up();
  if (sub.exemptionReasonCode) {
    cat.ele("cbc:TaxExemptionReasonCode").txt(sub.exemptionReasonCode).up();
  }
  if (sub.exemptionReason) {
    cat.ele("cbc:TaxExemptionReason").txt(sub.exemptionReason).up();
  }
  cat.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
  cat.up();
  ts.up();
}

/**
 * Build a UBL 2.1 invoice document meeting ZATCA Phase-2 / EN-16931 requirements.
 * Includes all mandatory fields: addresses, tax subtotals, ICV, PIH,
 * payment means, allowances/charges, and billing references for credit/debit notes.
 *
 * The UBLExtensions block is left as a placeholder — the XAdES signature module
 * injects the ds:Signature into it after this function returns.
 */
export function buildInvoiceXml(input: InvoiceInput, uuid: string): string {
  const totals = invoiceTotals(input.lines, input.allowances);
  const issueTime = input.issueTime ?? "00:00:00";
  const docType = input.documentType ?? "invoice";
  // 01 = standard, 02 = simplified (ZATCA invoice type sub-code).
  const transactionCode = input.kind === "simplified" ? "0200000" : "0100000";

  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("Invoice", {
    xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "xmlns:cac":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "xmlns:cbc":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "xmlns:ext":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
  });

  // --- UBLExtensions placeholder (XAdES signature injected here later) ---
  doc
    .ele("ext:UBLExtensions")
    .ele("ext:UBLExtension")
    .ele("ext:ExtensionURI")
    .txt("urn:oasis:names:specification:ubl:dsig:enveloped:xades")
    .up()
    .ele("ext:ExtensionContent")
    .txt("")  // placeholder for ds:Signature
    .up()
    .up()
    .up();

  doc.ele("cbc:ProfileID").txt("reporting:1.0").up();
  doc.ele("cbc:ID").txt(input.invoiceNumber).up();
  doc.ele("cbc:UUID").txt(uuid).up();
  doc.ele("cbc:IssueDate").txt(input.issueDate).up();
  doc.ele("cbc:IssueTime").txt(issueTime).up();
  doc.ele("cbc:InvoiceTypeCode", { name: transactionCode }).txt(TYPE_CODE[docType]).up();
  doc.ele("cbc:DocumentCurrencyCode").txt("SAR").up();
  doc.ele("cbc:TaxCurrencyCode").txt("SAR").up();

  // --- InstructionNote (for credit/debit notes) ---
  if (input.instructionNote) {
    doc.ele("cbc:Note").txt(input.instructionNote).up();
  }

  // --- BillingReference (for credit/debit notes) ---
  if (input.billingReferenceId) {
    doc
      .ele("cac:BillingReference")
      .ele("cac:InvoiceDocumentReference")
      .ele("cbc:ID")
      .txt(input.billingReferenceId)
      .up()
      .up()
      .up();
  }

  // --- AdditionalDocumentReference: ICV ---
  doc
    .ele("cac:AdditionalDocumentReference")
    .ele("cbc:ID")
    .txt("ICV")
    .up()
    .ele("cbc:UUID")
    .txt(String(input.icv ?? 1))
    .up()
    .up();

  // --- AdditionalDocumentReference: PIH ---
  doc
    .ele("cac:AdditionalDocumentReference")
    .ele("cbc:ID")
    .txt("PIH")
    .up()
    .ele("cac:Attachment")
    .ele("cbc:EmbeddedDocumentBinaryObject", { mimeCode: "text/plain" })
    .txt(input.previousHash ?? "")
    .up()
    .up()
    .up();

  // --- AdditionalDocumentReference: QR placeholder ---
  doc
    .ele("cac:AdditionalDocumentReference")
    .ele("cbc:ID")
    .txt("QR")
    .up()
    .ele("cac:Attachment")
    .ele("cbc:EmbeddedDocumentBinaryObject", { mimeCode: "text/plain" })
    .txt("")  // QR base64 injected after signing
    .up()
    .up()
    .up();

  // --- Seller ---
  const supplier = doc.ele("cac:AccountingSupplierParty").ele("cac:Party");
  if (input.seller.crNumber) {
    supplier
      .ele("cac:PartyIdentification")
      .ele("cbc:ID", { schemeID: "CRN" })
      .txt(input.seller.crNumber)
      .up()
      .up();
  }
  buildAddress(supplier, input.seller.address);
  supplier
    .ele("cac:PartyTaxScheme")
    .ele("cbc:CompanyID")
    .txt(input.seller.vatNumber)
    .up()
    .ele("cac:TaxScheme")
    .ele("cbc:ID")
    .txt("VAT")
    .up()
    .up()
    .up();
  supplier
    .ele("cac:PartyLegalEntity")
    .ele("cbc:RegistrationName")
    .txt(input.seller.name)
    .up()
    .up();
  supplier.up().up();

  // --- Buyer ---
  if (input.buyer) {
    const customer = doc.ele("cac:AccountingCustomerParty").ele("cac:Party");
    if (input.buyer.crNumber) {
      customer
        .ele("cac:PartyIdentification")
        .ele("cbc:ID", { schemeID: "CRN" })
        .txt(input.buyer.crNumber)
        .up()
        .up();
    }
    buildAddress(customer, input.buyer.address);
    if (input.buyer.vatNumber) {
      customer
        .ele("cac:PartyTaxScheme")
        .ele("cbc:CompanyID")
        .txt(input.buyer.vatNumber)
        .up()
        .ele("cac:TaxScheme")
        .ele("cbc:ID")
        .txt("VAT")
        .up()
        .up()
        .up();
    }
    customer
      .ele("cac:PartyLegalEntity")
      .ele("cbc:RegistrationName")
      .txt(input.buyer.name)
      .up()
      .up();
    customer.up().up();
  }

  // --- PaymentMeans ---
  const pmCode = input.paymentMeans?.code ?? "10";
  const pm = doc.ele("cac:PaymentMeans");
  pm.ele("cbc:PaymentMeansCode").txt(pmCode).up();
  if (input.paymentMeans?.instructionNote) {
    pm.ele("cbc:InstructionNote").txt(input.paymentMeans.instructionNote).up();
  }
  pm.up();

  // --- Document-level AllowanceCharge ---
  if (input.allowances) {
    for (const ac of input.allowances) {
      const acEl = doc.ele("cac:AllowanceCharge");
      acEl.ele("cbc:ChargeIndicator").txt(ac.isCharge ? "true" : "false").up();
      if (ac.reasonCode) {
        acEl.ele("cbc:AllowanceChargeReasonCode").txt(ac.reasonCode).up();
      }
      if (ac.reason) {
        acEl.ele("cbc:AllowanceChargeReason").txt(ac.reason).up();
      }
      acEl.ele("cbc:Amount", { currencyID: "SAR" }).txt(ac.amount.toFixed(2)).up();
      // Assume standard VAT for document-level allowances
      acEl
        .ele("cac:TaxCategory")
        .ele("cbc:ID").txt("S").up()
        .ele("cbc:Percent").txt("15.00").up()
        .ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up()
        .up();
      acEl.up();
    }
  }

  // --- TaxTotal (with per-category subtotals) ---
  const taxTotal = doc.ele("cac:TaxTotal");
  taxTotal
    .ele("cbc:TaxAmount", { currencyID: "SAR" })
    .txt(totals.vatAmount.toFixed(2))
    .up();
  for (const sub of totals.taxSubtotals) {
    buildTaxSubtotal(taxTotal, sub);
  }
  taxTotal.up();

  // Second TaxTotal with just the tax amount (ZATCA requires two TaxTotal elements)
  doc
    .ele("cac:TaxTotal")
    .ele("cbc:TaxAmount", { currencyID: "SAR" })
    .txt(totals.vatAmount.toFixed(2))
    .up()
    .up();

  // --- LegalMonetaryTotal ---
  const lmt = doc.ele("cac:LegalMonetaryTotal");
  lmt.ele("cbc:LineExtensionAmount", { currencyID: "SAR" })
    .txt(totals.taxableAmount.toFixed(2)).up();
  lmt.ele("cbc:TaxExclusiveAmount", { currencyID: "SAR" })
    .txt(totals.taxableAmount.toFixed(2)).up();
  lmt.ele("cbc:TaxInclusiveAmount", { currencyID: "SAR" })
    .txt(totals.grandTotal.toFixed(2)).up();
  if (totals.allowanceTotalAmount > 0) {
    lmt.ele("cbc:AllowanceTotalAmount", { currencyID: "SAR" })
      .txt(totals.allowanceTotalAmount.toFixed(2)).up();
  }
  if (totals.chargeTotalAmount > 0) {
    lmt.ele("cbc:ChargeTotalAmount", { currencyID: "SAR" })
      .txt(totals.chargeTotalAmount.toFixed(2)).up();
  }
  lmt.ele("cbc:PayableAmount", { currencyID: "SAR" })
    .txt(totals.grandTotal.toFixed(2)).up();
  lmt.up();

  // --- Invoice lines ---
  input.lines.forEach((line, i) => {
    const rate = effectiveRate(line);
    const cat = line.taxCategory ?? "S";
    const invLine = doc.ele("cac:InvoiceLine");
    invLine.ele("cbc:ID").txt(String(i + 1)).up();
    invLine
      .ele("cbc:InvoicedQuantity", { unitCode: line.unitCode ?? "PCE" })
      .txt(String(line.quantity))
      .up();
    invLine
      .ele("cbc:LineExtensionAmount", { currencyID: "SAR" })
      .txt(lineNet(line).toFixed(2))
      .up();

    // Line-level allowances/charges
    if (line.allowances) {
      for (const ac of line.allowances) {
        const acEl = invLine.ele("cac:AllowanceCharge");
        acEl.ele("cbc:ChargeIndicator").txt(ac.isCharge ? "true" : "false").up();
        if (ac.reason) {
          acEl.ele("cbc:AllowanceChargeReason").txt(ac.reason).up();
        }
        acEl.ele("cbc:Amount", { currencyID: "SAR" }).txt(ac.amount.toFixed(2)).up();
        acEl.up();
      }
    }

    // Line tax total
    invLine
      .ele("cac:TaxTotal")
      .ele("cbc:TaxAmount", { currencyID: "SAR" })
      .txt(lineVat(line).toFixed(2))
      .up()
      .ele("cbc:RoundingAmount", { currencyID: "SAR" })
      .txt((lineNet(line) + lineVat(line)).toFixed(2))
      .up()
      .up();

    // Item
    const item = invLine.ele("cac:Item");
    item.ele("cbc:Name").txt(line.description).up();
    const taxCat = item.ele("cac:ClassifiedTaxCategory");
    taxCat.ele("cbc:ID").txt(cat).up();
    taxCat.ele("cbc:Percent").txt((rate * 100).toFixed(2)).up();
    if (line.exemptionReasonCode) {
      taxCat.ele("cbc:TaxExemptionReasonCode").txt(line.exemptionReasonCode).up();
    }
    if (line.exemptionReason) {
      taxCat.ele("cbc:TaxExemptionReason").txt(line.exemptionReason).up();
    }
    taxCat.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
    taxCat.up();
    item.up();

    // Price
    invLine
      .ele("cac:Price")
      .ele("cbc:PriceAmount", { currencyID: "SAR" })
      .txt(line.unitPrice.toFixed(2))
      .up()
      .up();

    invLine.up();
  });

  return doc.end({ prettyPrint: true });
}

import { create } from "xmlbuilder2";
import type { InvoiceInput } from "./types";
import { invoiceTotals, lineNet, lineVat, STANDARD_VAT_RATE } from "./money";

const TYPE_CODE: Record<string, string> = {
  invoice: "388",
  credit: "381",
  debit: "383",
};

/**
 * Build a UBL 2.1 invoice document for the given input. This is a faithful,
 * readable subset of the EN-16931 / ZATCA structure — enough to hash, sign and
 * clear in the sandbox. Returns a pretty-printed XML string.
 */
export function buildInvoiceXml(input: InvoiceInput, uuid: string): string {
  const totals = invoiceTotals(input.lines);
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
  });

  doc.ele("cbc:ProfileID").txt("reporting:1.0").up();
  doc.ele("cbc:ID").txt(input.invoiceNumber).up();
  doc.ele("cbc:UUID").txt(uuid).up();
  doc.ele("cbc:IssueDate").txt(input.issueDate).up();
  doc.ele("cbc:IssueTime").txt(issueTime).up();
  doc.ele("cbc:InvoiceTypeCode", { name: transactionCode }).txt(TYPE_CODE[docType]).up();
  doc.ele("cbc:DocumentCurrencyCode").txt("SAR").up();
  doc.ele("cbc:TaxCurrencyCode").txt("SAR").up();

  // Seller
  const supplier = doc.ele("cac:AccountingSupplierParty").ele("cac:Party");
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

  // Buyer (optional)
  if (input.buyer) {
    const customer = doc.ele("cac:AccountingCustomerParty").ele("cac:Party");
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

  // Tax total
  doc
    .ele("cac:TaxTotal")
    .ele("cbc:TaxAmount", { currencyID: "SAR" })
    .txt(totals.vatAmount.toFixed(2))
    .up()
    .up();

  // Legal monetary total
  doc
    .ele("cac:LegalMonetaryTotal")
    .ele("cbc:LineExtensionAmount", { currencyID: "SAR" })
    .txt(totals.taxableAmount.toFixed(2))
    .up()
    .ele("cbc:TaxExclusiveAmount", { currencyID: "SAR" })
    .txt(totals.taxableAmount.toFixed(2))
    .up()
    .ele("cbc:TaxInclusiveAmount", { currencyID: "SAR" })
    .txt(totals.grandTotal.toFixed(2))
    .up()
    .ele("cbc:PayableAmount", { currencyID: "SAR" })
    .txt(totals.grandTotal.toFixed(2))
    .up()
    .up();

  // Invoice lines
  input.lines.forEach((line, i) => {
    const rate = line.vatRate ?? STANDARD_VAT_RATE;
    doc
      .ele("cac:InvoiceLine")
      .ele("cbc:ID")
      .txt(String(i + 1))
      .up()
      .ele("cbc:InvoicedQuantity", { unitCode: "PCE" })
      .txt(String(line.quantity))
      .up()
      .ele("cbc:LineExtensionAmount", { currencyID: "SAR" })
      .txt(lineNet(line).toFixed(2))
      .up()
      .ele("cac:TaxTotal")
      .ele("cbc:TaxAmount", { currencyID: "SAR" })
      .txt(lineVat(line).toFixed(2))
      .up()
      .up()
      .ele("cac:Item")
      .ele("cbc:Name")
      .txt(line.description)
      .up()
      .ele("cac:ClassifiedTaxCategory")
      .ele("cbc:ID")
      .txt("S")
      .up()
      .ele("cbc:Percent")
      .txt((rate * 100).toFixed(2))
      .up()
      .up()
      .up()
      .ele("cac:Price")
      .ele("cbc:PriceAmount", { currencyID: "SAR" })
      .txt(line.unitPrice.toFixed(2))
      .up()
      .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
}

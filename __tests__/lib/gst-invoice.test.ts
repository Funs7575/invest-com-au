import { describe, it, expect } from "vitest";
import { buildInvoice, renderInvoiceHtml } from "@/lib/gst-invoice";

const SUPPLIER = {
  legalName: "Invest.com.au Pty Ltd",
  abn: "12 345 678 901",
};

const RECIPIENT = {
  name: "Alex Example",
  email: "alex@example.com",
};

describe("buildInvoice — GST math", () => {
  it("adds 10% GST on top of the ex-GST price", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-001",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [{ description: "Growth tier — monthly", exGstCents: 4900 }],
    });
    expect(inv.lineItems[0].exGstCents).toBe(4900);
    expect(inv.lineItems[0].gstCents).toBe(490);
    expect(inv.lineItems[0].gstInclusiveCents).toBe(5390);
    expect(inv.totalCents).toBe(5390);
  });

  it("sums multiple line items correctly", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-002",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [
        { description: "Lead 1", exGstCents: 5000 },
        { description: "Lead 2", exGstCents: 5000 },
        { description: "Lead 3", exGstCents: 5000 },
      ],
    });
    expect(inv.subtotals.exGstCents).toBe(15_000);
    expect(inv.subtotals.gstCents).toBe(1_500);
    expect(inv.totalCents).toBe(16_500);
  });

  it("produces zero GST when supplier is not GST registered", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-003",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [{ description: "x", exGstCents: 10_000 }],
      gstRegistered: false,
    });
    expect(inv.subtotals.gstCents).toBe(0);
    expect(inv.totalCents).toBe(10_000);
  });
});

describe("buildInvoice — ATO compliance checks", () => {
  it("is compliant for a small invoice with minimum fields", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-004",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [{ description: "Monthly plan", exGstCents: 4900 }],
    });
    expect(inv.atoCompliant).toBe(true);
    expect(inv.nonComplianceReasons).toEqual([]);
  });

  it("flags missing ABN on the supplier", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-005",
      issueDate: new Date("2026-04-15"),
      supplier: { legalName: "Invest.com.au Pty Ltd", abn: "not-an-abn" },
      recipient: RECIPIENT,
      lineItems: [{ description: "x", exGstCents: 100 }],
    });
    expect(inv.atoCompliant).toBe(false);
    expect(inv.nonComplianceReasons).toContain("supplier_abn_missing_or_malformed");
  });

  it("requires recipient ABN on invoices ≥ $1,000", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-006",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT, // no ABN
      lineItems: [{ description: "Elite annual", exGstCents: 100_000 }],
    });
    expect(inv.atoCompliant).toBe(false);
    expect(inv.nonComplianceReasons).toContain("recipient_abn_required_for_>=_$1000");
  });

  it("passes when recipient ABN is present for large invoices", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-007",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: { ...RECIPIENT, abn: "99 888 777 666" },
      lineItems: [{ description: "Elite annual", exGstCents: 100_000 }],
    });
    expect(inv.atoCompliant).toBe(true);
  });

  it("flags empty line items", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-008",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [],
    });
    expect(inv.atoCompliant).toBe(false);
    expect(inv.nonComplianceReasons).toContain("no_line_items");
  });
});

describe("renderInvoiceHtml", () => {
  it("includes 'Tax Invoice' and supplier ABN", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-009",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [{ description: "Item", exGstCents: 1000 }],
    });
    const html = renderInvoiceHtml(inv);
    expect(html).toContain("Tax Invoice");
    expect(html).toContain(SUPPLIER.abn);
    expect(html).toContain(SUPPLIER.legalName);
    expect(html).toContain(RECIPIENT.email);
  });

  it("escapes HTML entities in descriptions", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-010",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [{ description: "<script>alert(1)</script>", exGstCents: 100 }],
    });
    const html = renderInvoiceHtml(inv);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows the GST rate as 10%", () => {
    const inv = buildInvoice({
      invoiceNumber: "INV-011",
      issueDate: new Date("2026-04-15"),
      supplier: SUPPLIER,
      recipient: RECIPIENT,
      lineItems: [{ description: "x", exGstCents: 1000 }],
    });
    const html = renderInvoiceHtml(inv);
    expect(html).toContain("GST 10%");
  });
});

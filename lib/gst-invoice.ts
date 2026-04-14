/**
 * GST-compliant tax invoice generation for advisor + broker billing.
 *
 * ATO rules for a valid tax invoice (for amounts > $82.50):
 *   - Words "Tax Invoice" prominently
 *   - Supplier's identity: legal name + ABN
 *   - Recipient identity (for amounts > $1,000)
 *   - Date
 *   - Brief description of each item
 *   - GST-inclusive price
 *   - GST amount (if separate) OR statement that the total
 *     includes GST
 *   - For invoices ≥ $1,000: recipient's ABN as well
 *
 * Pure function — returns structured data. The caller renders
 * HTML / PDF / email body as it sees fit. We keep render logic
 * separate so the same invoice can go to email, a download
 * endpoint, and Xero export.
 */

export interface InvoiceLineItem {
  description: string;
  quantityDisplay?: string; // "1 month", "5 leads" etc
  /** Pre-GST amount in cents — GST is added on top */
  exGstCents: number;
}

export interface InvoiceInput {
  /** Unique reference shown on the invoice */
  invoiceNumber: string;
  /** Date of issue */
  issueDate: Date;
  /** Our legal entity */
  supplier: {
    legalName: string;
    abn: string;
    address?: string;
    website?: string;
  };
  /** The customer */
  recipient: {
    name: string;
    email: string;
    address?: string;
    abn?: string | null;
  };
  lineItems: InvoiceLineItem[];
  /** True if supplier is GST-registered. Defaults to true. */
  gstRegistered?: boolean;
  /** Supplier's GST rate; Australia is 10% */
  gstRate?: number;
  /** Payment reference (e.g. Stripe intent id) */
  paymentReference?: string | null;
  notes?: string | null;
}

export interface InvoiceOutput {
  invoiceNumber: string;
  issueDate: string;
  supplier: InvoiceInput["supplier"];
  recipient: InvoiceInput["recipient"];
  lineItems: Array<{
    description: string;
    quantityDisplay: string;
    exGstCents: number;
    gstCents: number;
    gstInclusiveCents: number;
  }>;
  subtotals: {
    exGstCents: number;
    gstCents: number;
    gstInclusiveCents: number;
  };
  gstRegistered: boolean;
  gstRate: number;
  paymentReference: string | null;
  notes: string | null;
  /** Total in cents (GST-inclusive) */
  totalCents: number;
  /** ATO compliance: true only when every required field is present */
  atoCompliant: boolean;
  /** Reasons the invoice is NOT compliant, if any */
  nonComplianceReasons: string[];
}

/**
 * Build a structured invoice record. Pure + deterministic so
 * tests assert exact output.
 */
export function buildInvoice(input: InvoiceInput): InvoiceOutput {
  const gstRegistered = input.gstRegistered !== false;
  const gstRate = input.gstRate ?? 0.1;

  const lineItems = input.lineItems.map((item) => {
    const exGstCents = Math.round(item.exGstCents);
    const gstCents = gstRegistered ? Math.round(exGstCents * gstRate) : 0;
    return {
      description: item.description,
      quantityDisplay: item.quantityDisplay || "1",
      exGstCents,
      gstCents,
      gstInclusiveCents: exGstCents + gstCents,
    };
  });

  const exGstCents = lineItems.reduce((s, li) => s + li.exGstCents, 0);
  const gstCents = lineItems.reduce((s, li) => s + li.gstCents, 0);
  const gstInclusiveCents = exGstCents + gstCents;
  const totalCents = gstInclusiveCents;

  // ATO compliance checks
  const nonComplianceReasons: string[] = [];
  if (!input.supplier.legalName) nonComplianceReasons.push("supplier_name_missing");
  if (!input.supplier.abn || !/^\d{11}$/.test(input.supplier.abn.replace(/\s/g, ""))) {
    nonComplianceReasons.push("supplier_abn_missing_or_malformed");
  }
  if (!input.invoiceNumber) nonComplianceReasons.push("invoice_number_missing");
  if (!input.issueDate) nonComplianceReasons.push("issue_date_missing");
  if (lineItems.length === 0) nonComplianceReasons.push("no_line_items");
  // Recipient ABN required for invoices ≥ $1,000 (100000 cents)
  if (totalCents >= 100_000 && !input.recipient.abn) {
    nonComplianceReasons.push("recipient_abn_required_for_>=_$1000");
  }
  // Recipient identity required for any amount, really
  if (!input.recipient.name && !input.recipient.email) {
    nonComplianceReasons.push("recipient_identity_missing");
  }

  return {
    invoiceNumber: input.invoiceNumber,
    issueDate: input.issueDate.toISOString().slice(0, 10),
    supplier: input.supplier,
    recipient: input.recipient,
    lineItems,
    subtotals: { exGstCents, gstCents, gstInclusiveCents },
    gstRegistered,
    gstRate,
    paymentReference: input.paymentReference ?? null,
    notes: input.notes ?? null,
    totalCents,
    atoCompliant: nonComplianceReasons.length === 0,
    nonComplianceReasons,
  };
}

/**
 * Render an invoice as a standalone HTML document for email or
 * PDF conversion. Pure string output — no React dependency.
 */
export function renderInvoiceHtml(invoice: InvoiceOutput): string {
  const fmt = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lineRows = invoice.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${escape(li.description)}<br><span style="color:#64748b;font-size:11px">${escape(li.quantityDisplay)}</span></td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(li.exGstCents)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(li.gstCents)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${fmt(li.gstInclusiveCents)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Tax Invoice ${escape(invoice.invoiceNumber)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;padding:32px;color:#0f172a">
  <h1 style="font-size:24px;margin:0 0 4px">Tax Invoice</h1>
  <p style="color:#64748b;font-size:12px;margin:0 0 24px">Invoice ${escape(invoice.invoiceNumber)} · Issued ${escape(invoice.issueDate)}</p>

  <div style="display:flex;gap:32px;margin-bottom:24px">
    <div style="flex:1">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0 0 4px">From</p>
      <p style="margin:0;font-weight:600">${escape(invoice.supplier.legalName)}</p>
      <p style="margin:0;font-size:12px;color:#334155">ABN ${escape(invoice.supplier.abn)}</p>
      ${invoice.supplier.address ? `<p style="margin:0;font-size:12px;color:#334155">${escape(invoice.supplier.address)}</p>` : ""}
      ${invoice.supplier.website ? `<p style="margin:0;font-size:12px;color:#334155">${escape(invoice.supplier.website)}</p>` : ""}
    </div>
    <div style="flex:1">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0 0 4px">Billed to</p>
      <p style="margin:0;font-weight:600">${escape(invoice.recipient.name)}</p>
      <p style="margin:0;font-size:12px;color:#334155">${escape(invoice.recipient.email)}</p>
      ${invoice.recipient.abn ? `<p style="margin:0;font-size:12px;color:#334155">ABN ${escape(invoice.recipient.abn)}</p>` : ""}
      ${invoice.recipient.address ? `<p style="margin:0;font-size:12px;color:#334155">${escape(invoice.recipient.address)}</p>` : ""}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr style="background:#f8fafc">
        <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Description</th>
        <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Ex-GST</th>
        <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">GST</th>
        <th style="padding:10px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">Total</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding:10px;text-align:right;font-size:12px;color:#64748b">Subtotal (ex GST)</td>
        <td style="padding:10px;text-align:right">${fmt(invoice.subtotals.exGstCents)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:10px;text-align:right;font-size:12px;color:#64748b">GST ${(invoice.gstRate * 100).toFixed(0)}%</td>
        <td style="padding:10px;text-align:right">${fmt(invoice.subtotals.gstCents)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:12px 10px;text-align:right;font-weight:700;font-size:14px;border-top:2px solid #0f172a">Total (AUD, inc GST)</td>
        <td style="padding:12px 10px;text-align:right;font-weight:700;font-size:14px;border-top:2px solid #0f172a">${fmt(invoice.totalCents)}</td>
      </tr>
    </tfoot>
  </table>

  ${
    invoice.paymentReference
      ? `<p style="font-size:12px;color:#64748b;margin:0 0 8px">Payment reference: ${escape(invoice.paymentReference)}</p>`
      : ""
  }
  ${invoice.notes ? `<p style="font-size:12px;color:#64748b;margin:0 0 16px">${escape(invoice.notes)}</p>` : ""}

  <p style="margin-top:32px;font-size:11px;color:#94a3b8;line-height:1.6">
    ${invoice.gstRegistered ? "Tax invoice issued in accordance with A New Tax System (Goods and Services Tax) Act 1999." : "Supplier is not registered for GST."}
  </p>
</body></html>`;
}

function escape(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

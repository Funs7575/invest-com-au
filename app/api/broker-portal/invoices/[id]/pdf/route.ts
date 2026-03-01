import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface LineItem {
  description: string;
  amount_cents: number;
  quantity?: number;
}

function formatAUD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) {
    return new Response("Invalid invoice ID", { status: 400 });
  }

  // --- Authenticate via cookies ---
  const cookieHeader = request.headers.get("cookie") || "";
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // --- Service role client for data access ---
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // --- Verify broker account ownership ---
  const { data: account } = await supabase
    .from("broker_accounts")
    .select("broker_slug")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!account) {
    return new Response("No active broker account", { status: 403 });
  }

  // --- Fetch invoice (scoped to this broker) ---
  const { data: invoice, error } = await supabase
    .from("marketplace_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("broker_slug", account.broker_slug)
    .maybeSingle();

  if (error || !invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  // --- Parse line items ---
  let lineItems: LineItem[] = [];
  if (invoice.line_items) {
    try {
      const parsed =
        typeof invoice.line_items === "string"
          ? JSON.parse(invoice.line_items)
          : invoice.line_items;
      if (Array.isArray(parsed)) {
        lineItems = parsed;
      }
    } catch {
      // fall through to default
    }
  }

  if (lineItems.length === 0) {
    lineItems = [
      {
        description: invoice.description || "Invoice charge",
        amount_cents: invoice.amount_cents,
        quantity: 1,
      },
    ];
  }

  // --- Compute totals ---
  const subtotalCents =
    invoice.subtotal_cents ??
    lineItems.reduce((sum, li) => sum + li.amount_cents * (li.quantity ?? 1), 0);
  const taxCents = invoice.tax_cents ?? Math.round(subtotalCents / 11);
  const totalCents = invoice.amount_cents;

  // --- Status label ---
  const statusLabel =
    invoice.status === "paid"
      ? "PAID"
      : invoice.status === "pending"
        ? "PENDING"
        : invoice.status === "failed"
          ? "FAILED"
          : invoice.status === "refunded"
            ? "REFUNDED"
            : invoice.status.toUpperCase();

  const statusColor =
    invoice.status === "paid"
      ? "#16a34a"
      : invoice.status === "pending"
        ? "#ca8a04"
        : invoice.status === "failed"
          ? "#dc2626"
          : "#2563eb";

  // --- Build line items rows ---
  const lineItemsHtml = lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">
          ${escapeHtml(li.description)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;text-align:center;">
          ${li.quantity ?? 1}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;text-align:right;">
          ${formatAUD(li.amount_cents)}
        </td>
      </tr>`
    )
    .join("");

  // --- Build Bill-To section ---
  const billToLines: string[] = [];
  if (invoice.broker_company_name) {
    billToLines.push(escapeHtml(invoice.broker_company_name));
  }
  if (invoice.broker_email) {
    billToLines.push(escapeHtml(invoice.broker_email));
  }
  if (invoice.broker_abn) {
    billToLines.push(`ABN: ${escapeHtml(invoice.broker_abn)}`);
  }
  if (billToLines.length === 0) {
    billToLines.push(escapeHtml(account.broker_slug));
  }

  const billToHtml = billToLines
    .map((line) => `<div style="color:#334155;font-size:14px;">${line}</div>`)
    .join("");

  // --- Render HTML ---
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(invoice.invoice_number || String(invoice.id))}</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 20mm; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      line-height: 1.5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 32px auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    @media print {
      body { background: #fff; }
      .invoice-container { margin: 0; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <!-- Print / Download controls -->
  <div class="no-print" style="max-width:800px;margin:24px auto 0;display:flex;gap:12px;justify-content:flex-end;padding:0 16px;">
    <button onclick="window.print()" style="
      padding:10px 24px;background:#0f172a;color:#fff;border:none;border-radius:8px;
      font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;
    ">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="
      padding:10px 24px;background:#e2e8f0;color:#334155;border:none;border-radius:8px;
      font-size:14px;font-weight:600;cursor:pointer;
    ">Close</button>
  </div>

  <div class="invoice-container">
    <!-- Header -->
    <div style="padding:40px 40px 24px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
          Invest.com.au
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Partner Marketplace</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:24px;font-weight:700;color:#0f172a;letter-spacing:1px;">TAX INVOICE</div>
        <div style="
          display:inline-block;margin-top:8px;padding:4px 14px;border-radius:20px;
          font-size:12px;font-weight:700;letter-spacing:0.5px;
          background:${statusColor}18;color:${statusColor};
        ">${statusLabel}</div>
      </div>
    </div>

    <!-- Invoice meta + Bill To -->
    <div style="padding:0 40px 32px;display:flex;justify-content:space-between;gap:40px;flex-wrap:wrap;">
      <div>
        <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
          Invoice Details
        </div>
        <div style="color:#334155;font-size:14px;">
          <strong>Invoice #:</strong> ${escapeHtml(invoice.invoice_number || String(invoice.id))}
        </div>
        <div style="color:#334155;font-size:14px;">
          <strong>Date:</strong> ${formatDate(invoice.created_at || new Date().toISOString())}
        </div>
        ${
          invoice.paid_at
            ? `<div style="color:#334155;font-size:14px;"><strong>Paid:</strong> ${formatDate(invoice.paid_at)}</div>`
            : ""
        }
        <div style="color:#334155;font-size:14px;">
          <strong>Currency:</strong> ${escapeHtml(invoice.currency || "AUD")}
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
          Bill To
        </div>
        ${billToHtml}
      </div>
    </div>

    <!-- Line items table -->
    <div style="padding:0 40px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;">
              Description
            </th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;">
              Qty
            </th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:0 40px 40px;">
      <div style="max-width:280px;margin-left:auto;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#64748b;">
          <span>Subtotal (excl. GST)</span>
          <span>${formatAUD(subtotalCents - taxCents)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#64748b;">
          <span>GST (10%)</span>
          <span>${formatAUD(taxCents)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:18px;font-weight:700;color:#0f172a;border-top:2px solid #0f172a;margin-top:4px;">
          <span>Total (AUD)</span>
          <span>${formatAUD(totalCents)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:12px;color:#94a3b8;">
        Generated by Invest.com.au Partner Portal
      </div>
    </div>
  </div>
</body>
</html>`;

  const invoiceNumber = invoice.invoice_number || String(invoice.id);
  const safeFilename = `invoice-${invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.html`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
    },
  });
}

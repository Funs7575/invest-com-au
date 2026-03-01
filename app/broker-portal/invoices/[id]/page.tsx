"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface LineItem {
  description: string;
  qty: number;
  amount_cents: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  broker_company_name: string;
  broker_email: string;
  line_items: LineItem[] | string;
  subtotal_cents: number;
  tax_cents: number;
  amount_cents: number;
  status: "paid" | "pending" | "failed" | "refunded";
  stripe_payment_intent_id: string | null;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/broker-portal/login");
        return;
      }

      try {
        const res = await fetch(`/api/marketplace/invoice/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "Failed to load invoice");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInvoice(data.invoice as Invoice);
      } catch {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Link
          href="/broker-portal/invoices"
          className="text-sm text-slate-700 hover:underline font-medium"
        >
          &larr; Back to Invoices
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-red-600">{error || "Invoice not found."}</p>
        </div>
      </div>
    );
  }

  const lineItems: LineItem[] =
    typeof invoice.line_items === "string"
      ? JSON.parse(invoice.line_items)
      : invoice.line_items || [];

  const formatAUD = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const statusBadge = (status: Invoice["status"]) => {
    const map: Record<Invoice["status"], string> = {
      paid: "bg-emerald-50 text-slate-700",
      pending: "bg-yellow-50 text-yellow-700",
      failed: "bg-red-50 text-red-700",
      refunded: "bg-slate-100 text-slate-600",
    };
    return (
      <span
        className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || "bg-slate-100 text-slate-600"}`}
      >
        {status}
      </span>
    );
  };

  const truncatedStripeId = invoice.stripe_payment_intent_id
    ? invoice.stripe_payment_intent_id.length > 24
      ? `${invoice.stripe_payment_intent_id.slice(0, 24)}...`
      : invoice.stripe_payment_intent_id
    : null;

  return (
    <div className="space-y-6">
      {/* Navigation - hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/broker-portal/invoices"
          className="text-sm text-slate-700 hover:underline font-medium"
        >
          &larr; Back to Invoices
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
        >
          Print Receipt
        </button>
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:shadow-none print:p-0 portal-page-enter">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Invest.com.au
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Invest.com.au Pty Ltd
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Tax Invoice
            </span>
          </div>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">
              Invoice Number
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {invoice.invoice_number}
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mt-3 mb-1">
              Invoice Date
            </p>
            <p className="text-sm text-slate-700">
              {formatDate(invoice.created_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-1">
              From
            </p>
            <p className="text-sm text-slate-700">Invest.com.au Pty Ltd</p>

            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mt-3 mb-1">
              To
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {invoice.broker_company_name}
            </p>
            <p className="text-sm text-slate-500">{invoice.broker_email}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6 print:border-slate-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide print:bg-slate-100">
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 text-slate-700">
                    {item.description}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {item.qty}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {formatAUD(item.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-900">
                {formatAUD(invoice.subtotal_cents)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GST (10%)</span>
              <span className="font-semibold text-slate-900">
                {formatAUD(invoice.tax_cents)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-extrabold text-slate-900">
                {formatAUD(invoice.amount_cents)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Payment Status:</span>
            {statusBadge(invoice.status)}
          </div>
          {truncatedStripeId && (
            <div className="text-xs text-slate-400">
              Stripe Ref:{" "}
              <span className="font-mono text-slate-500">
                {truncatedStripeId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

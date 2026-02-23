"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Invoice {
  id: number;
  invoice_number: string;
  created_at: string;
  description: string;
  amount_cents: number;
  status: "paid" | "pending" | "failed" | "refunded";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) return;

      const { data: rows } = await supabase
        .from("marketplace_invoices")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false });

      setInvoices((rows || []) as Invoice[]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-32 animate-pulse" />
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const statusBadge = (status: Invoice["status"]) => {
    const map: Record<Invoice["status"], string> = {
      paid: "bg-green-50 text-green-700",
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatAUD = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500">
          View your wallet top-up invoices and receipts.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No invoices yet. Top up your wallet to generate an invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-900 font-medium whitespace-nowrap">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-[250px] truncate">
                      {inv.description || "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatAUD(inv.amount_cents)}
                    </td>
                    <td className="px-5 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {inv.status === "paid" ? (
                        <Link
                          href={`/broker-portal/invoices/${inv.id}`}
                          className="text-xs font-bold text-green-700 hover:text-green-800 hover:underline"
                        >
                          View Receipt
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-300">\u2014</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

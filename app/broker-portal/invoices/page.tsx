"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import CountUp from "@/components/CountUp";

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

  const STATUS_CONFIG: Record<Invoice["status"], { bg: string; icon: string; iconColor: string }> = {
    paid: { bg: "bg-emerald-50 text-emerald-700", icon: "check-circle", iconColor: "text-emerald-600" },
    pending: { bg: "bg-yellow-50 text-yellow-700", icon: "clock", iconColor: "text-yellow-600" },
    failed: { bg: "bg-red-50 text-red-700", icon: "x-circle", iconColor: "text-red-600" },
    refunded: { bg: "bg-blue-50 text-blue-600", icon: "arrow-up", iconColor: "text-blue-600" },
  };

  const statusBadge = (status: Invoice["status"]) => {
    const cfg = STATUS_CONFIG[status] || { bg: "bg-slate-100 text-slate-600", icon: "info", iconColor: "text-slate-500" };
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg}`}>
        <Icon name={cfg.icon} size={11} className={cfg.iconColor} />
        {status}
      </span>
    );
  };

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount_cents, 0);
  const paidCount = invoices.filter(i => i.status === "paid").length;
  const pendingAmount = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount_cents, 0);

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
        <p className="text-sm text-slate-500 mt-1">Receipts for wallet top-ups and package payments. Download receipts for your records.</p>
      </div>

      {/* KPI Cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 portal-stagger">
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon name="file-text" size={14} className="text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Total Invoiced</span>
              <InfoTip text="Sum of all invoice amounts, regardless of payment status." />
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              <CountUp end={totalInvoiced / 100} prefix="$" decimals={2} duration={1000} />
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon name="check-circle" size={14} className="text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Paid</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              <CountUp end={paidCount} duration={800} />
              <span className="text-sm font-medium text-slate-400 ml-1">/ {invoices.length}</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Icon name="clock" size={14} className="text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Pending</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              <CountUp end={pendingAmount / 100} prefix="$" decimals={2} duration={1000} />
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Icon name="trending-up" size={14} className="text-purple-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Success Rate</span>
              <InfoTip text="Percentage of invoices that were successfully paid. Failed payments may need to be retried." />
            </div>
            <p className="text-xl font-extrabold text-slate-900">
              <CountUp end={invoices.length > 0 ? (paidCount / invoices.length) * 100 : 0} decimals={0} suffix="%" duration={1000} />
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Icon name="file-text" size={20} className="text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No invoices yet</p>
            <p className="text-xs text-slate-400 mb-4">Invoices are created when you top up your wallet or subscribe to a package.</p>
            <a href="/broker-portal/wallet" className="inline-block px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">
              Top Up Wallet &rarr;
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto portal-table-stagger">
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
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/broker-portal/invoices/${inv.id}`}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline"
                          >
                            View
                          </Link>
                          <a
                            href={`/api/broker-portal/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            <Icon name="download" size={10} />
                            PDF
                          </a>
                        </div>
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

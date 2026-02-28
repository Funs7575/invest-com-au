"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

interface WalletRow {
  broker_slug: string;
  balance_cents: number;
  lifetime_deposited_cents: number;
  lifetime_spent_cents: number;
}

interface InvoiceRow {
  broker_slug: string;
  amount_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
}

interface ReconciliationRow {
  broker_slug: string;
  wallet_balance: number;
  total_deposited: number;
  total_spent: number;
  expected_balance: number;
  discrepancy: number;
  paid_invoices: number;
  pending_invoices: number;
  has_issue: boolean;
}

export default function ReconciliationPage() {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [{ data: wallets }, { data: invoices }, { data: transactions }] = await Promise.all([
        supabase.from("broker_wallets").select("broker_slug, balance_cents, lifetime_deposited_cents, lifetime_spent_cents"),
        supabase.from("marketplace_invoices").select("broker_slug, amount_cents, status, stripe_payment_intent_id"),
        supabase.from("wallet_transactions").select("broker_slug, type, amount_cents"),
      ]);

      const walletsMap = new Map<string, WalletRow>();
      for (const w of (wallets || []) as WalletRow[]) {
        walletsMap.set(w.broker_slug, w);
      }

      // Calculate transaction totals per broker
      const txnTotals = new Map<string, { deposits: number; spends: number; refunds: number; adjustments: number }>();
      for (const t of (transactions || []) as { broker_slug: string; type: string; amount_cents: number }[]) {
        const existing = txnTotals.get(t.broker_slug) || { deposits: 0, spends: 0, refunds: 0, adjustments: 0 };
        if (t.type === "deposit") existing.deposits += t.amount_cents;
        else if (t.type === "spend") existing.spends += t.amount_cents;
        else if (t.type === "refund") existing.refunds += t.amount_cents;
        else if (t.type === "adjustment") existing.adjustments += t.amount_cents;
        txnTotals.set(t.broker_slug, existing);
      }

      // Calculate invoice totals per broker
      const invoiceTotals = new Map<string, { paid: number; pending: number }>();
      for (const inv of (invoices || []) as InvoiceRow[]) {
        const existing = invoiceTotals.get(inv.broker_slug) || { paid: 0, pending: 0 };
        if (inv.status === "paid") existing.paid += inv.amount_cents;
        else if (inv.status === "pending") existing.pending += inv.amount_cents;
        invoiceTotals.set(inv.broker_slug, existing);
      }

      // Build reconciliation rows
      const result: ReconciliationRow[] = [];
      for (const [slug, wallet] of walletsMap) {
        const txn = txnTotals.get(slug) || { deposits: 0, spends: 0, refunds: 0, adjustments: 0 };
        const inv = invoiceTotals.get(slug) || { paid: 0, pending: 0 };

        const expectedBalance = txn.deposits - txn.spends + txn.refunds + txn.adjustments;
        const discrepancy = wallet.balance_cents - expectedBalance;

        result.push({
          broker_slug: slug,
          wallet_balance: wallet.balance_cents,
          total_deposited: wallet.lifetime_deposited_cents,
          total_spent: wallet.lifetime_spent_cents,
          expected_balance: expectedBalance,
          discrepancy,
          paid_invoices: inv.paid,
          pending_invoices: inv.pending,
          has_issue: Math.abs(discrepancy) > 1, // >$0.01 discrepancy
        });
      }

      // Sort: issues first, then by broker
      result.sort((a, b) => {
        if (a.has_issue !== b.has_issue) return a.has_issue ? -1 : 1;
        return a.broker_slug.localeCompare(b.broker_slug);
      });

      setRows(result);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = showOnlyIssues ? rows.filter(r => r.has_issue) : rows;
  const issueCount = rows.filter(r => r.has_issue).length;
  const totalBalance = rows.reduce((s, r) => s + r.wallet_balance, 0);
  const totalDeposited = rows.reduce((s, r) => s + r.total_deposited, 0);
  const totalSpent = rows.reduce((s, r) => s + r.total_spent, 0);
  const totalDiscrepancy = rows.reduce((s, r) => s + Math.abs(r.discrepancy), 0);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Revenue Reconciliation</h1>
          <p className="text-sm text-slate-500">Reconcile campaign spend against wallet balances and verify click data accuracy.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Accounts</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{rows.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Balance</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">${(totalBalance / 100).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Deposited</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">${(totalDeposited / 100).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Spent</p>
            <p className="text-2xl font-extrabold text-red-700 mt-1">${(totalSpent / 100).toLocaleString()}</p>
          </div>
          <div className={`rounded-xl border p-4 ${issueCount > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Issues</p>
            <p className={`text-2xl font-extrabold mt-1 ${issueCount > 0 ? "text-red-700" : "text-green-700"}`}>
              {issueCount === 0 ? "✓ Clean" : `${issueCount} found`}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showOnlyIssues} onChange={(e) => setShowOnlyIssues(e.target.checked)}
              className="w-4 h-4" />
            Show only discrepancies
          </label>
          {totalDiscrepancy > 0 && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-medium">
              Total discrepancy: ${(totalDiscrepancy / 100).toFixed(2)}
            </span>
          )}
        </div>

        {/* Reconciliation Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Broker</th>
                  <th className="px-4 py-3 text-right">Wallet Balance</th>
                  <th className="px-4 py-3 text-right">Deposited</th>
                  <th className="px-4 py-3 text-right">Spent</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Discrepancy</th>
                  <th className="px-4 py-3 text-right">Paid Invoices</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => (
                  <tr key={r.broker_slug} className={`hover:bg-slate-50 ${r.has_issue ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.broker_slug}</td>
                    <td className="px-4 py-3 text-right font-bold">${(r.wallet_balance / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-700">${(r.total_deposited / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-700">${(r.total_spent / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">${(r.expected_balance / 100).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      r.has_issue ? "text-red-700" : "text-green-700"
                    }`}>
                      {r.discrepancy === 0 ? "$0.00" : (r.discrepancy > 0 ? "+" : "") + "$" + (r.discrepancy / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">${(r.paid_invoices / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.pending_invoices > 0 ? (
                        <span className="text-xs font-bold text-amber-700">${(r.pending_invoices / 100).toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.has_issue ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⚠ Mismatch</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

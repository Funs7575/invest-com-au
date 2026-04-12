"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Icon from "@/components/Icon";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Transaction {
  id: number; date: string; type: "income" | "expense"; category: string;
  description: string; amount_cents: number; counterparty: string | null;
  reference: string | null; recurring: boolean; recurring_interval: string | null;
  notes: string | null; created_at: string;
}

interface MonthlySummary {
  month: string; income_cents: number; expense_cents: number; net_cents: number;
  income_count: number; expense_count: number;
}

const INCOME_CATEGORIES = [
  { key: "advisor_credits", label: "Advisor Credit Packs", color: "bg-violet-500" },
  { key: "affiliate", label: "Affiliate Commissions", color: "bg-emerald-500" },
  { key: "featured", label: "Featured Advisor Fees", color: "bg-amber-500" },
  { key: "article", label: "Expert Article Fees", color: "bg-blue-500" },
  { key: "sponsored", label: "Sponsored Placements", color: "bg-indigo-500" },
  { key: "other_income", label: "Other Income", color: "bg-slate-500" },
];

const EXPENSE_CATEGORIES = [
  { key: "hosting", label: "Hosting & Infrastructure", color: "bg-red-400" },
  { key: "domain", label: "Domain & DNS", color: "bg-red-300" },
  { key: "software", label: "Software & SaaS", color: "bg-orange-400" },
  { key: "marketing", label: "Marketing & Ads", color: "bg-pink-400" },
  { key: "legal", label: "Legal & Compliance", color: "bg-purple-400" },
  { key: "insurance", label: "Insurance", color: "bg-purple-300" },
  { key: "contractor", label: "Contractors & Freelancers", color: "bg-yellow-500" },
  { key: "stripe_fees", label: "Stripe/Payment Fees", color: "bg-slate-400" },
  { key: "other_expense", label: "Other Expense", color: "bg-slate-300" },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const EMPTY_TX: Partial<Transaction> = {
  date: new Date().toISOString().slice(0, 10), type: "income", category: "advisor_credits",
  description: "", amount_cents: 0, counterparty: "", reference: "", recurring: false, recurring_interval: null, notes: "",
};

function fmt(cents: number): string {
  return "$" + (Math.abs(cents) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinanceDashboardPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Transaction> | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"overview" | "transactions" | "recurring">("overview");
  const [amountInput, setAmountInput] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txnRes, monthRes] = await Promise.all([
      supabase.from("finance_transactions").select("*").order("date", { ascending: false }).limit(500),
      supabase.from("finance_monthly_summary").select("*").limit(24),
    ]);
    setTxns((txnRes.data || []) as Transaction[]);
    setMonthly((monthRes.data || []) as MonthlySummary[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-pull Stripe revenue into transactions
  const syncStripeRevenue = useCallback(async () => {
    const { data: billing } = await supabase
      .from("advisor_billing")
      .select("id, amount_cents, professional_id, description, status, created_at")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!billing || billing.length === 0) return;

    const { data: existingRefs } = await supabase
      .from("finance_transactions")
      .select("reference")
      .eq("category", "advisor_credits")
      .not("reference", "is", null);

    const existingSet = new Set((existingRefs || []).map(r => r.reference));
    let added = 0;

    for (const b of billing) {
      const ref = `advisor_billing_${b.id}`;
      if (existingSet.has(ref)) continue;
      await supabase.from("finance_transactions").insert({
        date: new Date(b.created_at).toISOString().slice(0, 10),
        type: "income", category: "advisor_credits",
        description: b.description || `Advisor lead payment`,
        amount_cents: b.amount_cents,
        counterparty: `Advisor #${b.professional_id}`,
        reference: ref,
      });
      added++;
    }
    if (added > 0) loadData();
    return added;
  }, [supabase, loadData]);

  const handleSave = async () => {
    if (!editing?.description || !editing.amount_cents) return;
    setSaving(true);
    const { id, created_at, ...payload } = editing as Transaction;
    if (id) {
      await supabase.from("finance_transactions").update(payload).eq("id", id);
    } else {
      await supabase.from("finance_transactions").insert(payload);
    }
    setSaving(false);
    setEditing(null);
    setAmountInput("");
    loadData();
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    await supabase.from("finance_transactions").delete().eq("id", deleteId);
    setDeleteId(null);
    loadData();
  };

  // Computed
  const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount_cents, 0);
  const totalExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount_cents, 0);
  const netProfit = totalIncome - totalExpenses;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTxns = txns.filter(t => t.date.startsWith(thisMonth));
  const thisMonthIncome = thisMonthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount_cents, 0);
  const thisMonthExpenses = thisMonthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount_cents, 0);
  const monthlyRecurringExpenses = txns.filter(t => t.type === "expense" && t.recurring && t.recurring_interval === "monthly").reduce((s, t) => s + t.amount_cents, 0);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns.filter(t => t.type === "income")) map.set(t.category, (map.get(t.category) || 0) + t.amount_cents);
    return INCOME_CATEGORIES.map(c => ({ ...c, amount: map.get(c.key) || 0 })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [txns]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns.filter(t => t.type === "expense")) map.set(t.category, (map.get(t.category) || 0) + t.amount_cents);
    return EXPENSE_CATEGORIES.map(c => ({ ...c, amount: map.get(c.key) || 0 })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [txns]);

  const recurringTxns = txns.filter(t => t.recurring);

  return (
    <AdminShell title="Finance" subtitle="Track all money in and out — revenue, expenses, and profit">
      {/* Tabs */}
      <div className="flex gap-1.5 mb-6">
        {(["overview", "transactions", "recurring"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
            {t === "overview" ? "Overview" : t === "transactions" ? `Transactions (${txns.length})` : `Recurring (${recurringTxns.length})`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={async () => { const n = await syncStripeRevenue(); alert(n ? `Synced ${n} new payments` : "Already up to date"); }}
          className="px-3 py-1.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200">
          Sync Stripe Revenue
        </button>
        <button onClick={() => { setEditing({ ...EMPTY_TX }); setAmountInput(""); }}
          className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800">
          + Add Transaction
        </button>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading...</div>}

      {/* ─── OVERVIEW TAB ─── */}
      {!loading && tab === "overview" && (
        <>
          {/* Top cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className={`rounded-xl p-4 col-span-2 md:col-span-1 ${netProfit >= 0 ? "bg-emerald-600" : "bg-red-600"} text-white`}>
              <p className="text-[0.6rem] font-bold uppercase tracking-wider opacity-80">Net Profit</p>
              <p className="text-2xl font-extrabold">{netProfit >= 0 ? "" : "-"}{fmt(netProfit)}</p>
              <p className="text-[0.55rem] opacity-70">all time</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Total Income</p>
              <p className="text-2xl font-extrabold text-emerald-600">{fmt(totalIncome)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Total Expenses</p>
              <p className="text-2xl font-extrabold text-red-600">{fmt(totalExpenses)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">This Month Income</p>
              <p className="text-2xl font-extrabold text-emerald-600">{fmt(thisMonthIncome)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Monthly Burn</p>
              <p className="text-2xl font-extrabold text-red-600">{fmt(monthlyRecurringExpenses)}</p>
              <p className="text-[0.55rem] text-slate-400">recurring</p>
            </div>
          </div>

          {/* Revenue breakdown */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Income by Category</h3>
              {incomeByCategory.length === 0 ? <p className="text-sm text-slate-400">No income recorded yet</p> : (
                <div className="space-y-2">
                  {incomeByCategory.map(c => (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${c.color}`} />
                      <span className="text-xs text-slate-700 flex-1">{c.label}</span>
                      <span className="text-sm font-bold text-slate-900">{fmt(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Expenses by Category</h3>
              {expenseByCategory.length === 0 ? <p className="text-sm text-slate-400">No expenses recorded yet</p> : (
                <div className="space-y-2">
                  {expenseByCategory.map(c => (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${c.color}`} />
                      <span className="text-xs text-slate-700 flex-1">{c.label}</span>
                      <span className="text-sm font-bold text-slate-900">{fmt(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly P&L */}
          {monthly.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Monthly P&L</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="text-left py-2 font-semibold">Month</th>
                    <th className="text-right py-2 font-semibold">Income</th>
                    <th className="text-right py-2 font-semibold">Expenses</th>
                    <th className="text-right py-2 font-semibold">Net</th>
                  </tr></thead>
                  <tbody>
                    {monthly.map(m => (
                      <tr key={m.month} className="border-b border-slate-50">
                        <td className="py-2 font-medium">{new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</td>
                        <td className="py-2 text-right text-emerald-600 font-semibold">{fmt(m.income_cents)}</td>
                        <td className="py-2 text-right text-red-600 font-semibold">{fmt(m.expense_cents)}</td>
                        <td className={`py-2 text-right font-bold ${m.net_cents >= 0 ? "text-emerald-700" : "text-red-700"}`}>{m.net_cents >= 0 ? "" : "-"}{fmt(m.net_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TRANSACTIONS TAB ─── */}
      {!loading && tab === "transactions" && (
        <div className="space-y-2">
          {txns.map(t => (
            <div key={t.id} className={`bg-white border rounded-lg px-4 py-3 flex items-center gap-3 ${t.type === "income" ? "border-emerald-100" : "border-red-100"}`}>
              <div className={`w-2 h-8 rounded-full ${t.type === "income" ? "bg-emerald-500" : "bg-red-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate">{t.description}</span>
                  {t.recurring && <span className="text-[0.5rem] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">RECURRING</span>}
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(t.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  {t.counterparty && <> · {t.counterparty}</>}
                  {" · "}{ALL_CATEGORIES.find(c => c.key === t.category)?.label || t.category}
                </p>
              </div>
              <span className={`text-sm font-bold shrink-0 ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount_cents)}
              </span>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditing(t); setAmountInput((t.amount_cents / 100).toFixed(2)); }} className="p-1.5 text-slate-400 hover:text-slate-700"><Icon name="pencil" size={14} /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Icon name="trash-2" size={14} /></button>
              </div>
            </div>
          ))}
          {txns.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No transactions yet. Add your first one above.</div>}
        </div>
      )}

      {/* ─── RECURRING TAB ─── */}
      {!loading && tab === "recurring" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[0.6rem] text-slate-500 uppercase font-medium">Monthly Recurring Expenses</p>
              <p className="text-2xl font-extrabold text-red-600">{fmt(monthlyRecurringExpenses)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[0.6rem] text-slate-500 uppercase font-medium">Annual Burn</p>
              <p className="text-2xl font-extrabold text-red-600">{fmt(monthlyRecurringExpenses * 12)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[0.6rem] text-slate-500 uppercase font-medium">Recurring Items</p>
              <p className="text-2xl font-extrabold text-slate-900">{recurringTxns.length}</p>
            </div>
          </div>
          <div className="space-y-2">
            {recurringTxns.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${t.type === "income" ? "bg-emerald-500" : "bg-red-400"}`} />
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-900">{t.description}</span>
                  <p className="text-xs text-slate-500">{t.counterparty} · {t.recurring_interval}</p>
                </div>
                <span className={`text-sm font-bold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {t.type === "income" ? "+" : "-"}{fmt(t.amount_cents)}/{t.recurring_interval === "yearly" ? "yr" : "mo"}
                </span>
                <button onClick={() => { setEditing(t); setAmountInput((t.amount_cents / 100).toFixed(2)); }} className="p-1.5 text-slate-400 hover:text-slate-700"><Icon name="pencil" size={14} /></button>
              </div>
            ))}
            {recurringTxns.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No recurring transactions. Add expenses like hosting, domains, and software.</div>}
          </div>
        </>
      )}

      {/* ─── EDIT MODAL ─── */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setEditing(null); setAmountInput(""); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editing.id ? "Edit" : "Add"} Transaction</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                  <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as "income" | "expense", category: e.target.value === "income" ? "advisor_credits" : "hosting" })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {(editing.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <input value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Vercel Pro monthly" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount ($)</label>
                  <input type="number" step="0.01" value={amountInput} onChange={e => { setAmountInput(e.target.value); setEditing({ ...editing, amount_cents: Math.round(parseFloat(e.target.value || "0") * 100) }); }} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="49.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input type="date" value={editing.date?.slice(0, 10) || ""} onChange={e => setEditing({ ...editing, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Counterparty</label>
                  <input value={editing.counterparty || ""} onChange={e => setEditing({ ...editing, counterparty: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Vercel, Stripe" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reference</label>
                  <input value={editing.reference || ""} onChange={e => setEditing({ ...editing, reference: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Invoice #, Stripe ID" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.recurring || false} onChange={e => setEditing({ ...editing, recurring: e.target.checked })} className="rounded" />
                  Recurring
                </label>
                {editing.recurring && (
                  <select value={editing.recurring_interval || "monthly"} onChange={e => setEditing({ ...editing, recurring_interval: e.target.value })} className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving || !editing.description || !editing.amount_cents} className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(null); setAmountInput(""); }} className="px-5 py-2 bg-slate-100 text-slate-600 font-semibold rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete transaction?"
        message="This transaction will be permanently removed from the finance ledger. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </AdminShell>
  );
}

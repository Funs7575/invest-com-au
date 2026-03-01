"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import Sparkline from "@/components/Sparkline";
import type { BrokerWallet, WalletTransaction } from "@/lib/types";

const TOPUP_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function WalletPage() {
  const [wallet, setWallet] = useState<BrokerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [brokerSlug, setBrokerSlug] = useState("");
  const { toast } = useToast();

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
      setBrokerSlug(account.broker_slug);

      const { data: w } = await supabase
        .from("broker_wallets")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .maybeSingle();

      setWallet(w as BrokerWallet | null);

      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false })
        .limit(50);

      setTransactions((txns || []) as WalletTransaction[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleTopup = async (amount: number) => {
    setTopupLoading(true);
    try {
      const res = await fetch("/api/marketplace/wallet-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (data.url) {
        toast("Redirecting to Stripe...", "info");
        window.location.href = data.url;
      } else {
        toast(data.error || "Failed to create checkout session", "error");
        setTopupLoading(false);
      }
    } catch {
      toast("Network error. Please try again.", "error");
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-32 animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const balance = wallet?.balance_cents || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Wallet</h1>
        <p className="text-sm text-slate-500">Manage your advertising balance</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-300 font-medium flex items-center gap-1">Available Balance <InfoTip text="Your current wallet balance. CPC clicks and featured placement fees are deducted from this automatically." /></p>
            <p className="text-4xl font-extrabold mt-1">
              <CountUp end={balance / 100} prefix="$" decimals={2} duration={1000} />
            </p>
          </div>
          {/* Balance history sparkline from transactions */}
          {transactions.length >= 3 && (
            <div className="mt-2">
              <Sparkline
                data={[...transactions].reverse().map(t => t.balance_after_cents / 100).slice(-10)}
                color="#fbbf24"
                width={100}
                height={32}
              />
              <p className="text-[0.56rem] text-slate-400 text-right mt-0.5">Balance trend</p>
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-3 text-sm text-slate-300">
          <span className="flex items-center gap-1">Lifetime Deposited: <CountUp end={(wallet?.lifetime_deposited_cents || 0) / 100} prefix="$" decimals={2} duration={1200} /> <InfoTip text="Total amount you have ever deposited into your wallet, including refunds received." /></span>
          <span className="flex items-center gap-1">Lifetime Spent: <CountUp end={(wallet?.lifetime_spent_cents || 0) / 100} prefix="$" decimals={2} duration={1200} /> <InfoTip text="Total amount charged for campaigns since your account was created." /></span>
        </div>

        {/* Deposit vs Spent bar */}
        {wallet && wallet.lifetime_deposited_cents > 0 && (() => {
          const deposited = wallet.lifetime_deposited_cents;
          const spent = wallet.lifetime_spent_cents;
          const remaining = deposited - spent;
          const spentPct = Math.round((spent / deposited) * 100);
          const remainingPct = 100 - spentPct;
          return (
            <div className="mt-4">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-400" style={{ width: `${remainingPct}%` }} />
                <div className="bg-red-400" style={{ width: `${spentPct}%` }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[0.69rem]">
                <span className="text-emerald-300">Remaining ${(remaining / 100).toFixed(0)} ({remainingPct}%)</span>
                <span className="text-red-300">Spent ${(spent / 100).toFixed(0)} ({spentPct}%)</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Top-up */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 mb-4">Add Funds</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {TOPUP_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleTopup(amt)}
              disabled={topupLoading}
              className="py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all hover-lift active:scale-95 disabled:opacity-50"
            >
              ${amt}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
            <input
              type="number"
              min="50"
              max="50000"
              step="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Custom amount (min $50)"
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            />
          </div>
          <button
            onClick={() => {
              const amt = parseInt(customAmount, 10);
              if (amt >= 50 && amt <= 50000) handleTopup(amt);
              else toast("Amount must be between $50 and $50,000", "error");
            }}
            disabled={topupLoading || !customAmount}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {topupLoading ? "Processing..." : "Top Up"}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Payments are processed securely via Stripe. Funds are available immediately.
        </p>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="wallet" size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No transactions yet</p>
            <p className="text-xs text-slate-400">Top up your wallet to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto portal-table-stagger">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        t.type === "deposit" ? "bg-emerald-50 text-emerald-700" :
                        t.type === "spend" ? "bg-red-50 text-red-700" :
                        t.type === "refund" ? "bg-blue-50 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        <Icon
                          name={t.type === "deposit" ? "arrow-up" : t.type === "refund" ? "arrow-up" : "arrow-down"}
                          size={11}
                          className={t.type === "deposit" ? "text-emerald-600" : t.type === "refund" ? "text-blue-600" : "text-red-600"}
                        />
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-[250px] truncate">
                      {t.description || "—"}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${
                      t.type === "spend" ? "text-red-700" : "text-emerald-700"
                    }`}>
                      {t.type === "spend" ? "-" : "+"}${(t.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      ${(t.balance_after_cents / 100).toFixed(2)}
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

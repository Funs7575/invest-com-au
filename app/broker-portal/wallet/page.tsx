"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BrokerWallet, WalletTransaction } from "@/lib/types";

const TOPUP_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function WalletPage() {
  const [wallet, setWallet] = useState<BrokerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [brokerSlug, setBrokerSlug] = useState("");

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
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
        setTopupLoading(false);
      }
    } catch {
      alert("Network error. Please try again.");
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
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-6 text-white">
        <p className="text-sm text-green-200 font-medium">Available Balance</p>
        <p className="text-4xl font-extrabold mt-1">
          ${(balance / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
        </p>
        <div className="flex gap-4 mt-3 text-sm text-green-200">
          <span>Deposited: ${((wallet?.lifetime_deposited_cents || 0) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
          <span>Spent: ${((wallet?.lifetime_spent_cents || 0) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
        </div>
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
              className="py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors disabled:opacity-50"
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
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
            />
          </div>
          <button
            onClick={() => {
              const amt = parseInt(customAmount, 10);
              if (amt >= 50 && amt <= 50000) handleTopup(amt);
              else alert("Amount must be between $50 and $50,000");
            }}
            disabled={topupLoading || !customAmount}
            className="px-6 py-2.5 bg-green-700 text-white font-bold text-sm rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
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
          <div className="p-8 text-center text-sm text-slate-400">
            No transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        t.type === "deposit" ? "bg-green-50 text-green-700" :
                        t.type === "spend" ? "bg-red-50 text-red-700" :
                        t.type === "refund" ? "bg-blue-50 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-[250px] truncate">
                      {t.description || "—"}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${
                      t.type === "spend" ? "text-red-700" : "text-green-700"
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

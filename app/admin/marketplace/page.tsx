"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface MarketplaceStats {
  totalWalletDeposits: number;
  totalWalletBalance: number;
  activeCampaigns: number;
  pendingReviews: number;
  todayRevenue: number;
  totalBrokerAccounts: number;
  totalCampaigns: number;
  recentTransactions: {
    broker_slug: string;
    type: string;
    amount_cents: number;
    description: string;
    created_at: string;
  }[];
}

export default function MarketplaceOverviewPage() {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [walletsRes, campaignsRes, accountsRes, txnsRes, todayEventsRes] =
        await Promise.all([
          supabase.from("broker_wallets").select("balance_cents, lifetime_deposited_cents, lifetime_spent_cents"),
          supabase.from("campaigns").select("id, status"),
          supabase.from("broker_accounts").select("id, status"),
          supabase
            .from("wallet_transactions")
            .select("broker_slug, type, amount_cents, description, created_at")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("campaign_events")
            .select("cost_cents")
            .gte("created_at", new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"),
        ]);

      const wallets = walletsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const accounts = accountsRes.data || [];

      setStats({
        totalWalletDeposits: wallets.reduce((s, w) => s + (w.lifetime_deposited_cents || 0), 0),
        totalWalletBalance: wallets.reduce((s, w) => s + (w.balance_cents || 0), 0),
        activeCampaigns: campaigns.filter((c) => c.status === "active").length,
        pendingReviews: campaigns.filter((c) => c.status === "pending_review").length,
        todayRevenue: (todayEventsRes.data || []).reduce((s: number, e: { cost_cents: number }) => s + (e.cost_cents || 0), 0),
        totalBrokerAccounts: accounts.length,
        totalCampaigns: campaigns.length,
        recentTransactions: (txnsRes.data || []) as MarketplaceStats["recentTransactions"],
      });

      setLoading(false);
    };
    load();
  }, []);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Marketplace</h1>
          <p className="text-sm text-slate-500">Broker advertising platform — deposits, CPC campaigns, and revenue overview.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Deposits",
                  value: `$${(stats.totalWalletDeposits / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
                  color: "text-emerald-700",
                },
                {
                  label: "Current Balance (All)",
                  value: `$${(stats.totalWalletBalance / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
                  color: "text-blue-700",
                },
                {
                  label: "Today's Revenue",
                  value: `$${(stats.todayRevenue / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
                  color: "text-emerald-700",
                },
                {
                  label: "Active Campaigns",
                  value: String(stats.activeCampaigns),
                  color: "text-slate-900",
                },
                {
                  label: "Pending Reviews",
                  value: String(stats.pendingReviews),
                  color: stats.pendingReviews > 0 ? "text-amber-600" : "text-slate-900",
                },
                {
                  label: "Total Campaigns",
                  value: String(stats.totalCampaigns),
                  color: "text-slate-900",
                },
                {
                  label: "Broker Accounts",
                  value: String(stats.totalBrokerAccounts),
                  color: "text-slate-900",
                },
                {
                  label: "Lifetime Revenue",
                  value: `$${((stats.totalWalletDeposits - stats.totalWalletBalance) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
                  color: "text-purple-700",
                },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{k.label}</p>
                  <p className={`text-xl font-extrabold mt-1 ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/marketplace/campaigns"
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-2">📣</div>
                <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Campaign Review
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {stats.pendingReviews > 0
                    ? `${stats.pendingReviews} campaign(s) awaiting review`
                    : "No pending reviews"}
                </p>
              </Link>
              <Link
                href="/admin/marketplace/brokers"
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-2">🤝</div>
                <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Broker Accounts
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {stats.totalBrokerAccounts} registered broker account(s)
                </p>
              </Link>
              <Link
                href="/broker-portal"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-2">🏪</div>
                <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Broker Portal
                </h3>
                <p className="text-sm text-slate-500 mt-1">View the broker-facing portal</p>
              </Link>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Recent Wallet Transactions</h2>
              </div>
              {stats.recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No transactions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-5 py-3 text-left">Date</th>
                        <th className="px-5 py-3 text-left">Broker</th>
                        <th className="px-5 py-3 text-left">Type</th>
                        <th className="px-5 py-3 text-left">Description</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentTransactions.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-900">{t.broker_slug}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                t.type === "deposit"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : t.type === "spend"
                                  ? "bg-red-50 text-red-700"
                                  : t.type === "refund"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600 max-w-[250px] truncate">
                            {t.description || "—"}
                          </td>
                          <td
                            className={`px-5 py-3 text-right font-semibold ${
                              t.type === "spend" ? "text-red-700" : "text-emerald-700"
                            }`}
                          >
                            {t.type === "spend" ? "-" : "+"}${(t.amount_cents / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

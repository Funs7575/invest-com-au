"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import Sparkline from "@/components/Sparkline";
import type { Campaign, BrokerWallet } from "@/lib/types";

export default function BrokerDashboard() {
  const [wallet, setWallet] = useState<BrokerWallet | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentClicks, setRecentClicks] = useState(0);
  const [todaySpend, setTodaySpend] = useState(0);
  const [dailyClicks, setDailyClicks] = useState<number[]>([]);
  const [dailySpend, setDailySpend] = useState<number[]>([]);
  const [prevClicks, setPrevClicks] = useState(0);
  const [prevSpend, setPrevSpend] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) return;
      const slug = account.broker_slug;
      setFirstName((account.full_name || "").split(" ")[0]);

      // Wallet
      const { data: w } = await supabase
        .from("broker_wallets")
        .select("*")
        .eq("broker_slug", slug)
        .maybeSingle();
      setWallet(w as BrokerWallet | null);

      // Active campaigns
      const { data: camps } = await supabase
        .from("campaigns")
        .select("*, marketplace_placements(name)")
        .eq("broker_slug", slug)
        .in("status", ["active", "approved", "pending_review"])
        .order("created_at", { ascending: false })
        .limit(5);
      setCampaigns((camps || []) as Campaign[]);

      // Recent clicks (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase
        .from("campaign_events")
        .select("id", { count: "exact", head: true })
        .eq("broker_slug", slug)
        .eq("event_type", "click")
        .gte("created_at", weekAgo);
      setRecentClicks(count || 0);

      // Today's spend
      const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
      const { data: todayEvents } = await supabase
        .from("campaign_events")
        .select("cost_cents")
        .eq("broker_slug", slug)
        .gte("created_at", todayStart);
      setTodaySpend(
        (todayEvents || []).reduce((sum, e) => sum + (e.cost_cents || 0), 0)
      );

      // Fetch last 14 days of daily stats for sparklines & trend comparison
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const { data: dailyStats } = await supabase
        .from("campaign_daily_stats")
        .select("stat_date, clicks, spend_cents")
        .eq("broker_slug", slug)
        .gte("stat_date", twoWeeksAgo)
        .order("stat_date", { ascending: true });

      if (dailyStats && dailyStats.length > 0) {
        // Aggregate by date
        const byDate = new Map<string, { clicks: number; spend: number }>();
        for (const s of dailyStats) {
          const existing = byDate.get(s.stat_date) || { clicks: 0, spend: 0 };
          existing.clicks += s.clicks;
          existing.spend += s.spend_cents;
          byDate.set(s.stat_date, existing);
        }
        const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
        setDailyClicks(sorted.map(([, v]) => v.clicks));
        setDailySpend(sorted.map(([, v]) => v.spend));

        // Trend: compare last 7d vs previous 7d
        const mid = Math.floor(sorted.length / 2);
        const prevHalf = sorted.slice(0, mid);
        const currHalf = sorted.slice(mid);
        setPrevClicks(prevHalf.reduce((s, [, v]) => s + v.clicks, 0));
        setPrevSpend(prevHalf.reduce((s, [, v]) => s + v.spend, 0));
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const balance = wallet?.balance_cents || 0;
  const activeCampaignCount = campaigns.filter((c) => c.status === "active").length;
  const totalCampaignCount = campaigns.length;

  // Burn rate: avg daily spend over past 7 days
  const dailyBurn = todaySpend > 0 ? todaySpend : 0;
  const daysLeft = dailyBurn > 0 ? Math.floor(balance / dailyBurn) : null;

  // Donut ring for active/total campaigns
  const donutPct = totalCampaignCount > 0 ? (activeCampaignCount / totalCampaignCount) * 100 : 0;
  const donutRadius = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutOffset = donutCircumference - (donutPct / 100) * donutCircumference;

  // Wallet color based on balance
  const walletBorderColor = balance >= 10000 ? "border-l-green-500" : balance >= 2000 ? "border-l-amber-500" : "border-l-red-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        </h1>
        <p className="text-sm text-slate-500">Your advertising overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 portal-stagger">
        <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${walletBorderColor} p-5 hover-lift`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
              <Icon name="wallet" size={14} className="text-amber-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Wallet Balance</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-700 mt-1">
            <CountUp end={balance / 100} prefix="$" decimals={2} duration={1000} />
          </p>
          {daysLeft !== null && daysLeft < 30 && (
            <p className="text-[0.69rem] text-slate-400 mt-0.5">~{daysLeft} days of budget left</p>
          )}
          {balance < (wallet?.low_balance_threshold_cents || 5000) ? (
            <Link href="/broker-portal/wallet" className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-2 inline-block">
              Low balance — Add Funds →
            </Link>
          ) : (
            <Link href="/broker-portal/wallet" className="text-xs text-slate-500 hover:text-slate-700 mt-2 inline-block">
              Add Funds →
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon name="megaphone" size={14} className="text-blue-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Campaigns</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-2xl font-extrabold text-slate-900">
              <CountUp end={activeCampaignCount} duration={800} />
            </p>
            {totalCampaignCount > 0 && (
              <div className="flex items-center gap-1.5">
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r={donutRadius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle cx="18" cy="18" r={donutRadius} fill="none" stroke="#3b82f6" strokeWidth="4"
                    strokeDasharray={donutCircumference} strokeDashoffset={donutOffset}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <span className="text-[0.62rem] text-slate-400">of {totalCampaignCount}</span>
              </div>
            )}
          </div>
          <Link href="/broker-portal/campaigns" className="text-xs text-slate-500 hover:text-slate-700 mt-2 inline-block">
            View All →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center">
              <Icon name="mouse-pointer-click" size={14} className="text-green-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Clicks (7d)</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-extrabold text-slate-900">
              <CountUp end={recentClicks} duration={1000} />
            </p>
            {dailyClicks.length >= 4 && (
              <Sparkline data={dailyClicks.slice(-7)} color="#16a34a" height={22} width={60} />
            )}
          </div>
          {prevClicks > 0 && (() => {
            const changePct = Math.round(((recentClicks - prevClicks) / prevClicks) * 100);
            return changePct !== 0 ? (
              <p className={`text-[0.62rem] font-bold mt-0.5 flex items-center gap-0.5 ${changePct > 0 ? "text-green-600" : "text-red-500"}`}>
                <Icon name={changePct > 0 ? "arrow-up" : "arrow-down"} size={10} />
                {Math.abs(changePct)}% vs prev week
              </p>
            ) : null;
          })()}
          <Link href="/broker-portal/reports" className="text-xs text-slate-500 hover:text-slate-700 mt-2 inline-block">
            See Report →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
              <Icon name="dollar-sign" size={14} className="text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Today&apos;s Spend</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-extrabold text-slate-900">
              <CountUp end={todaySpend / 100} prefix="$" decimals={2} duration={1000} />
            </p>
            {dailySpend.length >= 4 && (
              <Sparkline data={dailySpend.slice(-7)} color="#9333ea" height={22} width={60} />
            )}
          </div>
          {prevSpend > 0 && (() => {
            const currentWeekSpend = dailySpend.slice(-7).reduce((s, v) => s + v, 0);
            const changePct = Math.round(((currentWeekSpend - prevSpend) / prevSpend) * 100);
            return changePct !== 0 ? (
              <p className={`text-[0.62rem] font-bold mt-0.5 flex items-center gap-0.5 ${changePct > 0 ? "text-red-500" : "text-green-600"}`}>
                <Icon name={changePct > 0 ? "arrow-up" : "arrow-down"} size={10} />
                {Math.abs(changePct)}% vs prev week
              </p>
            ) : null;
          })()}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/broker-portal/campaigns/new"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
        >
          + New Campaign
        </Link>
        <Link
          href="/broker-portal/wallet"
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors"
        >
          Top Up Wallet
        </Link>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Recent Campaigns</h2>
          <Link href="/broker-portal/campaigns" className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
            View All
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <Icon name="megaphone" size={20} className="text-amber-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No campaigns yet</p>
            <p className="text-xs text-slate-400 mb-4">Launch your first campaign to start driving traffic.</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/broker-portal/campaigns/new"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Create Campaign
              </Link>
              <Link
                href="/broker-portal/packages"
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
              >
                View Packages
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 portal-stagger">
            {campaigns.map((c) => {
              const placement = Array.isArray(c.placement) ? c.placement[0] : c.placement;
              const placementName = (placement as any)?.name || (c as any).marketplace_placements?.name || "—";
              const budgetPct = c.total_budget_cents
                ? Math.min(100, Math.round((c.total_spent_cents / c.total_budget_cents) * 100))
                : 0;
              const statusDot = c.status === "active" ? "bg-green-500" :
                c.status === "pending_review" ? "bg-amber-500" :
                c.status === "approved" ? "bg-blue-500" : "bg-slate-300";
              return (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{placementName}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      c.status === "active" ? "bg-green-50 text-green-700" :
                      c.status === "pending_review" ? "bg-amber-50 text-amber-700" :
                      c.status === "approved" ? "bg-blue-50 text-blue-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {c.total_budget_cents > 0 && (
                    <div className="mt-2 ml-4">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full progress-bar-animate ${
                            budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-green-500"
                          }`}
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                      <p className="text-[0.62rem] text-slate-400 mt-0.5">{budgetPct}% budget used</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lifetime Stats */}
      {wallet && (
        <div className="bg-slate-50 rounded-xl p-5 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-slate-500">Lifetime Deposited</p>
            <p className="text-sm font-bold text-slate-700">
              <CountUp end={wallet.lifetime_deposited_cents / 100} prefix="$" decimals={2} duration={1200} />
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Lifetime Spent</p>
            <p className="text-sm font-bold text-slate-700">
              <CountUp end={wallet.lifetime_spent_cents / 100} prefix="$" decimals={2} duration={1200} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

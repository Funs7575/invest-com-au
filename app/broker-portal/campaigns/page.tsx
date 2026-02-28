"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { Campaign } from "@/lib/types";

function getPlacementTypeVisual(name: string): { icon: string; bg: string; color: string } {
  const lower = name.toLowerCase();
  if (lower.includes("compare")) return { icon: "bar-chart", bg: "bg-blue-50", color: "text-blue-600" };
  if (lower.includes("quiz")) return { icon: "zap", bg: "bg-purple-50", color: "text-purple-600" };
  if (lower.includes("homepage") || lower.includes("home")) return { icon: "star", bg: "bg-amber-50", color: "text-amber-600" };
  if (lower.includes("article")) return { icon: "book-open", bg: "bg-green-50", color: "text-green-600" };
  if (lower.includes("deal")) return { icon: "tag", bg: "bg-red-50", color: "text-red-600" };
  return { icon: "layout", bg: "bg-slate-50", color: "text-slate-600" };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-slate-700",
  approved: "bg-blue-50 text-blue-700",
  pending_review: "bg-amber-50 text-amber-700",
  paused: "bg-slate-100 text-slate-600",
  budget_exhausted: "bg-red-50 text-red-700",
  completed: "bg-slate-100 text-slate-500",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-400",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
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

      const { data } = await supabase
        .from("campaigns")
        .select("*, marketplace_placements(name, inventory_type)")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false });

      setCampaigns((data || []) as Campaign[]);
      setLoading(false);
    };
    load();
  }, []);

  const handlePause = async (id: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Failed to pause campaign", "error");
      return;
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "paused" as const } : c))
    );
    toast("Campaign paused", "success");
  };

  const handleResume = async (id: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Failed to resume campaign", "error");
      return;
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "approved" as const } : c))
    );
    toast("Campaign submitted for approval", "success");
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this campaign? This cannot be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Failed to cancel campaign", "error");
      return;
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "cancelled" as const } : c))
    );
    toast("Campaign cancelled", "success");
  };

  const filtered = filter === "all"
    ? campaigns
    : campaigns.filter((c) => c.status === filter);

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const totalSpent = campaigns.reduce((s, c) => s + c.total_spent_cents, 0);
  const totalClicks = campaigns.reduce((s, c) => s + ((c as unknown as Record<string, number>).total_clicks || 0), 0);
  const avgCpc = totalClicks > 0 ? totalSpent / totalClicks / 100 : 0;

  const STATUS_DOTS: Record<string, string> = {
    active: "bg-green-500",
    approved: "bg-blue-500",
    pending_review: "bg-amber-500",
    paused: "bg-slate-400",
    budget_exhausted: "bg-red-500",
    completed: "bg-slate-300",
    rejected: "bg-red-400",
    cancelled: "bg-slate-300",
  };

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500">Manage campaigns from draft to completion. Filter by status, pause or cancel active campaigns.</p>
        </div>
        <Link
          href="/broker-portal/campaigns/new"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 portal-stagger">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
              <Icon name="megaphone" size={12} className="text-green-600" />
            </div>
            <p className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">Active Campaigns</p>
            <InfoTip text="Campaigns currently running and charging your wallet per click or per billing period." />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={activeCount} duration={800} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
              <Icon name="dollar-sign" size={12} className="text-red-600" />
            </div>
            <p className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">Total Spend</p>
            <InfoTip text="Cumulative spend across all campaigns since your account was created." />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={totalSpent / 100} prefix="$" decimals={2} duration={1000} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon name="mouse-pointer-click" size={12} className="text-blue-600" />
            </div>
            <p className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">Avg CPC</p>
            <InfoTip text="Average Cost Per Click = Total Spend / Total Clicks. Lower is better for your budget." />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={avgCpc} prefix="$" decimals={2} duration={1000} />
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "active", "pending_review", "approved", "paused", "budget_exhausted", "rejected", "cancelled", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
            {s !== "all" && (
              <span className="ml-1 opacity-70">
                ({campaigns.filter((c) => c.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Icon name="megaphone" size={20} className="text-amber-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            {filter === "all" ? "No campaigns yet" : `No ${filter.replace(/_/g, " ")} campaigns`}
          </p>
          <p className="text-xs text-slate-400 mb-4">
            {filter === "all" ? "Create your first campaign to get started." : "Try a different filter or create a new campaign."}
          </p>
          <Link href="/broker-portal/campaigns/new" className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors">
            Create Campaign →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 portal-stagger">
          {filtered.map((c) => {
            const p = (c as any).marketplace_placements;
            const placementName = Array.isArray(p) ? p[0]?.name : p?.name || "—";
            const budgetPct = c.total_budget_cents
              ? Math.min(100, Math.round((c.total_spent_cents / c.total_budget_cents) * 100))
              : 0;

            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${STATUS_DOTS[c.status] || "bg-slate-300"}`} />
                    <div>
                      <h3 className="font-bold text-slate-900">{c.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Icon name={p?.inventory_type === "featured" ? "megaphone" : "target"} size={11} className="text-slate-400" />
                        {(() => {
                          const vis = getPlacementTypeVisual(placementName);
                          return (
                            <span className={`w-5 h-5 rounded-full ${vis.bg} flex items-center justify-center`}>
                              <Icon name={vis.icon} size={10} className={vis.color} />
                            </span>
                          );
                        })()}
                        <p className="text-xs text-slate-500">{placementName}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-500"}`}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-slate-400">Rate</p>
                    <p className="font-semibold">
                      {c.inventory_type === "cpc"
                        ? `$${(c.rate_cents / 100).toFixed(2)}/click`
                        : `$${(c.rate_cents / 100).toFixed(0)}/mo`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Spent</p>
                    <p className="font-semibold">${(c.total_spent_cents / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Budget</p>
                    <p className="font-semibold">
                      {c.total_budget_cents ? `$${(c.total_budget_cents / 100).toFixed(0)}` : "Unlimited"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Dates</p>
                    <p className="font-semibold text-xs">
                      {c.start_date?.slice(0, 10)} — {c.end_date?.slice(0, 10) || "Ongoing"}
                    </p>
                  </div>
                </div>

                {/* Budget bar */}
                {c.total_budget_cents ? (
                  <div className="mb-3">
                    <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full progress-bar-animate ${
                          budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${budgetPct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[0.62rem] font-bold text-slate-700">
                        {budgetPct}% of ${(c.total_budget_cents / 100).toFixed(0)} budget
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Review notes */}
                {c.review_notes && (
                  <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg mb-3">
                    <strong>Review note:</strong> {c.review_notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {c.status === "active" && (
                    <button
                      onClick={() => handlePause(c.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      Pause
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button
                      onClick={() => handleResume(c.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      Resume
                    </button>
                  )}
                  {["active", "paused", "pending_review", "approved"].includes(c.status) && (
                    <button
                      onClick={() => handleCancel(c.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

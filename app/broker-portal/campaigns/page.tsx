"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import type { Campaign } from "@/lib/types";

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
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast("Failed to resume campaign", "error");
      return;
    }
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "active" as const } : c))
    );
    toast("Campaign resumed", "success");
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

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500">Manage your advertising campaigns</p>
        </div>
        <Link
          href="/broker-portal/campaigns/new"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "active", "pending_review", "approved", "paused", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
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
            {filter === "all" ? "No campaigns yet" : `No ${filter.replace("_", " ")} campaigns`}
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
                  <div>
                    <h3 className="font-bold text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{placementName}</p>
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
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full progress-bar-animate ${
                          budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{budgetPct}% of budget used</p>
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

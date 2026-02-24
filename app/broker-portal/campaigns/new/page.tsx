"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MarketplacePlacement } from "@/lib/types";

export default function NewCampaignPage() {
  const router = useRouter();
  const [placements, setPlacements] = useState<MarketplacePlacement[]>([]);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [placementId, setPlacementId] = useState<number | null>(null);
  const [rateCents, setRateCents] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");

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

      const { data: p } = await supabase
        .from("marketplace_placements")
        .select("*")
        .eq("is_active", true)
        .order("name");

      setPlacements((p || []) as MarketplacePlacement[]);
      setLoading(false);
    };
    load();
  }, []);

  const selectedPlacement = placements.find((p) => p.id === placementId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!placementId || !name || !rateCents || !startDate) {
      setError("Please fill in all required fields.");
      return;
    }

    const rate = Math.round(parseFloat(rateCents) * 100);
    if (rate <= 0) {
      setError("Rate must be greater than $0.");
      return;
    }

    if (selectedPlacement?.base_rate_cents && rate < selectedPlacement.base_rate_cents) {
      setError(`Minimum rate for this placement is $${(selectedPlacement.base_rate_cents / 100).toFixed(2)}`);
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: insertErr } = await supabase.from("campaigns").insert({
        broker_slug: brokerSlug,
        placement_id: placementId,
        name,
        inventory_type: selectedPlacement?.inventory_type || "cpc",
        rate_cents: rate,
        daily_budget_cents: dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : null,
        total_budget_cents: totalBudget ? Math.round(parseFloat(totalBudget) * 100) : null,
        start_date: startDate,
        end_date: endDate || null,
        status: "pending_review",
      });

      if (insertErr) {
        setError(insertErr.message);
        setSubmitting(false);
        return;
      }

      router.push("/broker-portal/campaigns");
    } catch {
      setError("Failed to create campaign.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">New Campaign</h1>
      <p className="text-sm text-slate-500 mb-6">
        Choose a placement and set your budget. Campaigns are reviewed before going live.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campaign name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q1 Compare Page Featured"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
        </div>

        {/* Placement selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Placement *</label>
          <div className="grid gap-3">
            {placements.map((p) => (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  placementId === p.id
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="placement"
                  value={p.id}
                  checked={placementId === p.id}
                  onChange={() => {
                    setPlacementId(p.id);
                    if (p.base_rate_cents) {
                      setRateCents((p.base_rate_cents / 100).toFixed(2));
                    }
                  }}
                  className="mt-1 accent-slate-700"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.inventory_type === "featured"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-blue-50 text-blue-700"
                    }`}>
                      {p.inventory_type.toUpperCase()}
                    </span>
                    {p.base_rate_cents && (
                      <span className="text-xs text-slate-500">
                        from ${(p.base_rate_cents / 100).toFixed(2)}{p.inventory_type === "cpc" ? "/click" : "/mo"}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {p.max_slots} slot{p.max_slots > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Rate */}
        {selectedPlacement && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rate (AUD) * — {selectedPlacement.inventory_type === "cpc" ? "per click" : "per month"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={rateCents}
                onChange={(e) => setRateCents(e.target.value)}
                required
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              />
            </div>
          </div>
        )}

        {/* Budget */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Daily Budget (AUD)
              <span className="text-xs text-slate-400 ml-1">optional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="1"
                min="1"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="No limit"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Total Budget (AUD)
              <span className="text-xs text-slate-400 ml-1">optional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="1"
                min="1"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder="No limit"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date
              <span className="text-xs text-slate-400 ml-1">optional</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Campaigns are reviewed by our team before going live. You&apos;ll be notified once approved.
        </p>
      </form>
    </div>
  );
}

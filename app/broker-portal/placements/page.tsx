"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { MarketplacePlacement } from "@/lib/types";

interface PlacementWithStats extends MarketplacePlacement {
  activeCampaigns: number;
}

function getPlacementVisual(name: string): { icon: string; bg: string; color: string } {
  const lower = name.toLowerCase();
  if (lower.includes("compare")) return { icon: "bar-chart", bg: "bg-blue-50", color: "text-blue-600" };
  if (lower.includes("quiz")) return { icon: "zap", bg: "bg-purple-50", color: "text-purple-600" };
  if (lower.includes("homepage") || lower.includes("home")) return { icon: "star", bg: "bg-amber-50", color: "text-amber-600" };
  if (lower.includes("article")) return { icon: "book-open", bg: "bg-emerald-50", color: "text-emerald-600" };
  if (lower.includes("deal")) return { icon: "tag", bg: "bg-red-50", color: "text-red-600" };
  if (lower.includes("sidebar")) return { icon: "layout", bg: "bg-indigo-50", color: "text-indigo-600" };
  if (lower.includes("calculator")) return { icon: "calculator", bg: "bg-cyan-50", color: "text-cyan-600" };
  if (lower.includes("sticky") || lower.includes("footer")) return { icon: "megaphone", bg: "bg-pink-50", color: "text-pink-600" };
  return { icon: "layout", bg: "bg-slate-50", color: "text-slate-600" };
}

function availabilityColor(available: number, max: number): { bar: string; badge: string; border: string } {
  if (available <= 0) return { bar: "bg-red-500", badge: "bg-red-50 text-red-700", border: "border-red-200" };
  if (available === 1) return { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700", border: "border-amber-200" };
  return { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", border: "border-emerald-200" };
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toLocaleString("en-AU");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function PlacementsPage() {
  const [placements, setPlacements] = useState<PlacementWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "full">("all");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // Fetch all active placements
      const { data: rawPlacements } = await supabase
        .from("marketplace_placements")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!rawPlacements || rawPlacements.length === 0) {
        setPlacements([]);
        setLoading(false);
        return;
      }

      // Fetch active campaign counts per placement_id
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("placement_id")
        .in("status", ["active", "approved"]);

      // Count active campaigns per placement
      const countMap = new Map<number, number>();
      for (const c of campaigns || []) {
        countMap.set(c.placement_id, (countMap.get(c.placement_id) || 0) + 1);
      }

      const merged: PlacementWithStats[] = (rawPlacements as MarketplacePlacement[]).map((p) => ({
        ...p,
        activeCampaigns: countMap.get(p.id) || 0,
      }));

      setPlacements(merged);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = placements.filter((p) => {
    if (filter === "available") return p.max_slots - p.activeCampaigns > 0;
    if (filter === "full") return p.max_slots - p.activeCampaigns <= 0;
    return true;
  });

  // Summary stats
  const totalPlacements = placements.length;
  const totalAvailableSlots = placements.reduce((s, p) => s + Math.max(0, p.max_slots - p.activeCampaigns), 0);
  const totalSlots = placements.reduce((s, p) => s + p.max_slots, 0);
  const ctrValues = placements.filter((p) => p.avg_ctr_pct != null && (p.avg_ctr_pct ?? 0) > 0).map((p) => p.avg_ctr_pct!);
  const minCtr = ctrValues.length > 0 ? Math.min(...ctrValues) : 0;
  const maxCtr = ctrValues.length > 0 ? Math.max(...ctrValues) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Placement Availability</h1>
          <p className="text-sm text-slate-500">
            Browse all marketplace placements, check slot availability, and launch campaigns.
          </p>
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
            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon name="layout" size={12} className="text-blue-600" />
            </div>
            <p className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">Total Placements</p>
            <InfoTip text="Number of active advertising placements available in the marketplace." />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={totalPlacements} duration={800} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <Icon name="check-circle" size={12} className="text-emerald-600" />
            </div>
            <p className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">Available Slots</p>
            <InfoTip text="Total open slots across all placements. Each placement has a maximum number of concurrent campaigns it supports." />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={totalAvailableSlots} duration={800} />
            <span className="text-sm font-medium text-slate-400 ml-1">of {totalSlots}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
              <Icon name="mouse-pointer-click" size={12} className="text-purple-600" />
            </div>
            <p className="text-[0.62rem] text-slate-500 font-bold uppercase tracking-wider">Avg CTR Range</p>
            <InfoTip text="Range of average click-through rates across placements. Higher CTR means more clicks per impression." />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {ctrValues.length > 0 ? (
              <>
                <CountUp end={minCtr} decimals={1} duration={800} suffix="%" />
                <span className="text-sm font-medium text-slate-400 mx-1">-</span>
                <CountUp end={maxCtr} decimals={1} duration={800} suffix="%" />
              </>
            ) : (
              <span className="text-sm text-slate-400">No data yet</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "all" as const, label: "All Placements" },
          { key: "available" as const, label: "Available" },
          { key: "full" as const, label: "Full" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
            <span className="ml-1 opacity-70">
              ({key === "all"
                ? placements.length
                : key === "available"
                ? placements.filter((p) => p.max_slots - p.activeCampaigns > 0).length
                : placements.filter((p) => p.max_slots - p.activeCampaigns <= 0).length})
            </span>
          </button>
        ))}
      </div>

      {/* Placement cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Icon name="layout" size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            {filter === "full" ? "No placements are full" : "No placements found"}
          </p>
          <p className="text-xs text-slate-400">
            {filter === "full"
              ? "All placements currently have open slots."
              : "Check back soon for new advertising placements."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 portal-stagger">
          {filtered.map((p) => {
            const visual = getPlacementVisual(p.name);
            const available = Math.max(0, p.max_slots - p.activeCampaigns);
            const colors = availabilityColor(available, p.max_slots);
            const fillPct = p.max_slots > 0 ? Math.round((p.activeCampaigns / p.max_slots) * 100) : 0;
            const hasRealStats = p.stats_updated_at != null;
            const impressions = p.monthly_impressions ?? 0;
            const avgCtr = p.avg_ctr_pct ?? 0;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border-2 p-5 transition-all hover-lift ${colors.border}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${visual.bg} flex items-center justify-center shrink-0`}>
                      <Icon name={visual.icon} size={18} className={visual.color} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            p.inventory_type === "featured"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {p.inventory_type === "featured" ? "Featured" : "CPC"}
                        </span>
                        <span className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {available > 0 ? `${available} of ${p.max_slots} open` : "Full"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {p.description && (
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{p.description}</p>
                )}

                {/* Availability bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[0.62rem] text-slate-500 mb-1">
                    <span className="font-medium">Slot Availability</span>
                    <span>{p.activeCampaigns} active / {p.max_slots} max</span>
                  </div>
                  <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                      style={{ width: `${Math.min(100, fillPct)}%` }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[0.62rem] text-slate-400 font-medium uppercase tracking-wide">Base Rate</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {p.base_rate_cents != null
                        ? p.inventory_type === "cpc"
                          ? `$${(p.base_rate_cents / 100).toFixed(2)}/click`
                          : `$${(p.base_rate_cents / 100).toFixed(0)}/mo`
                        : "Custom"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[0.62rem] text-slate-400 font-medium uppercase tracking-wide">Impressions</p>
                      <InfoTip
                        text={
                          hasRealStats
                            ? "Based on actual traffic data from the last 30 days."
                            : "Estimated based on historical page traffic. Real data will appear once the placement is live."
                        }
                      />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {impressions > 0 ? formatNumber(impressions) : "--"}
                      <span className="text-[0.55rem] text-slate-400 font-normal ml-1">/mo</span>
                    </p>
                    <p className={`text-[0.55rem] mt-0.5 ${hasRealStats ? "text-emerald-500" : "text-slate-400"}`}>
                      {hasRealStats ? "Real data" : "Estimated"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[0.62rem] text-slate-400 font-medium uppercase tracking-wide">Avg CTR</p>
                      <InfoTip text="Average click-through rate: the percentage of impressions that result in a click." />
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {avgCtr > 0 ? `${avgCtr.toFixed(1)}%` : "--"}
                    </p>
                  </div>
                </div>

                {/* Stats updated date */}
                {p.stats_updated_at && (
                  <p className="text-[0.55rem] text-slate-400 mb-3 flex items-center gap-1">
                    <Icon name="clock" size={9} className="text-slate-300" />
                    Stats updated {timeAgo(p.stats_updated_at)}
                  </p>
                )}

                {/* Action */}
                <Link
                  href="/broker-portal/campaigns/new"
                  className={`block w-full text-center px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                    available > 0
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-100 text-slate-400 pointer-events-none"
                  }`}
                  aria-disabled={available <= 0}
                  tabIndex={available <= 0 ? -1 : undefined}
                >
                  {available > 0 ? "Create Campaign" : "No Slots Available"}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-2">How Placements Work</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Icon name="mouse-pointer-click" size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">
                CPC Placements
                <InfoTip text="Cost-Per-Click: you only pay when a user clicks your ad. The base rate is the minimum bid per click." />
              </p>
              <p>Pay only when users click through. Set your own CPC rate at or above the base rate.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="star" size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">
                Featured Placements
                <InfoTip text="Premium fixed-position slots with guaranteed visibility. Billed monthly to your wallet." />
              </p>
              <p>Fixed monthly fee for premium positioning with guaranteed visibility.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Icon name="bar-chart" size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Slot Availability</p>
              <p>
                Each placement has limited slots. When full, new campaigns are waitlisted until a slot opens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

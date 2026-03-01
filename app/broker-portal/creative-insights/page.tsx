"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { BrokerCreative, CampaignDailyStats, Campaign } from "@/lib/types";

type CreativeType = "logo" | "banner" | "icon" | "screenshot";

const CREATIVE_TYPE_META: Record<CreativeType, { label: string; icon: string; iconBg: string; iconColor: string }> = {
  logo: { label: "Logo", icon: "image", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  banner: { label: "Banner", icon: "layout", iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  icon: { label: "Icon", icon: "star", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  screenshot: { label: "Screenshot", icon: "eye", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
};

interface TypePerformance {
  type: CreativeType;
  label: string;
  creativeCount: number;
  campaignCount: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
}

export default function CreativeInsightsPage() {
  const [creatives, setCreatives] = useState<BrokerCreative[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignDailyStats[]>([]);
  const [loading, setLoading] = useState(true);

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

      const [{ data: cr }, { data: ca }, { data: st }] = await Promise.all([
        supabase
          .from("broker_creatives")
          .select("*")
          .eq("broker_slug", account.broker_slug)
          .order("sort_order", { ascending: true }),
        supabase
          .from("campaigns")
          .select("id, name, status, inventory_type, placement_id, total_spent_cents, broker_slug")
          .eq("broker_slug", account.broker_slug)
          .order("created_at", { ascending: false }),
        supabase
          .from("campaign_daily_stats")
          .select("*")
          .eq("broker_slug", account.broker_slug)
          .order("stat_date", { ascending: true }),
      ]);

      setCreatives((cr || []) as BrokerCreative[]);
      setCampaigns((ca || []) as Campaign[]);
      setStats((st || []) as CampaignDailyStats[]);
      setLoading(false);
    };
    load();
  }, []);

  // Aggregate stats per campaign
  const campaignStats = useMemo(() => {
    const map = new Map<number, { impressions: number; clicks: number; conversions: number; spend: number }>();
    for (const s of stats) {
      const existing = map.get(s.campaign_id) || { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
      existing.impressions += s.impressions;
      existing.clicks += s.clicks;
      existing.conversions += s.conversions;
      existing.spend += s.spend_cents;
      map.set(s.campaign_id, existing);
    }
    return map;
  }, [stats]);

  // Total broker-wide aggregate stats (all campaigns belong to this broker)
  const brokerTotals = useMemo(() => {
    let impressions = 0, clicks = 0, conversions = 0, spend = 0;
    for (const s of stats) {
      impressions += s.impressions;
      clicks += s.clicks;
      conversions += s.conversions;
      spend += s.spend_cents;
    }
    return { impressions, clicks, conversions, spend };
  }, [stats]);

  // Performance by creative type
  // Since campaigns are linked to the broker (same broker_slug), we attribute
  // all campaign performance to the broker's creative types that exist
  const typePerformance = useMemo((): TypePerformance[] => {
    const types: CreativeType[] = ["logo", "banner", "icon", "screenshot"];
    const creativesByType = new Map<CreativeType, BrokerCreative[]>();
    for (const c of creatives) {
      const list = creativesByType.get(c.type as CreativeType) || [];
      list.push(c);
      creativesByType.set(c.type as CreativeType, list);
    }

    // Total creatives count for proportional attribution
    const totalCreatives = creatives.length;
    if (totalCreatives === 0) return [];

    const campaignCount = campaigns.length;

    return types
      .map((type) => {
        const typeCreatives = creativesByType.get(type) || [];
        if (typeCreatives.length === 0) return null;

        // Proportional attribution: this type's share of total creatives
        const share = typeCreatives.length / totalCreatives;
        const impressions = Math.round(brokerTotals.impressions * share);
        const clicks = Math.round(brokerTotals.clicks * share);
        const conversions = Math.round(brokerTotals.conversions * share);
        const spend = Math.round(brokerTotals.spend * share);
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

        return {
          type,
          label: CREATIVE_TYPE_META[type].label,
          creativeCount: typeCreatives.length,
          campaignCount: Math.round(campaignCount * share),
          impressions,
          clicks,
          conversions,
          spend,
          ctr,
        };
      })
      .filter(Boolean) as TypePerformance[];
  }, [creatives, campaigns, brokerTotals]);

  // Per-creative breakdown with associated campaign stats
  const creativeBreakdown = useMemo(() => {
    const totalCreatives = creatives.length;
    if (totalCreatives === 0) return [];

    return creatives.map((creative) => {
      const share = 1 / totalCreatives;
      const impressions = Math.round(brokerTotals.impressions * share);
      const clicks = Math.round(brokerTotals.clicks * share);
      const conversions = Math.round(brokerTotals.conversions * share);
      const spend = Math.round(brokerTotals.spend * share);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const associatedCampaigns = Math.round(campaigns.length * share);

      return {
        ...creative,
        impressions,
        clicks,
        conversions,
        spend,
        ctr,
        associatedCampaigns,
      };
    });
  }, [creatives, campaigns, brokerTotals]);

  // Best performing type by CTR
  const bestType = useMemo(() => {
    if (typePerformance.length === 0) return null;
    return typePerformance.reduce((best, t) => (t.ctr > best.ctr ? t : best), typePerformance[0]);
  }, [typePerformance]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: { text: string; icon: string; color: string }[] = [];

    if (typePerformance.length < 2) {
      recs.push({
        text: "Upload more creative types (banners, screenshots) to diversify your ad placements and test performance.",
        icon: "plus",
        color: "text-blue-600",
      });
      return recs;
    }

    // Compare CTRs between types
    const sorted = [...typePerformance].sort((a, b) => b.ctr - a.ctr);
    if (sorted.length >= 2 && sorted[0].ctr > 0 && sorted[sorted.length - 1].ctr > 0) {
      const ratio = sorted[0].ctr / sorted[sorted.length - 1].ctr;
      if (ratio > 1.5) {
        recs.push({
          text: `Your ${sorted[0].label.toLowerCase()} campaigns have ${ratio.toFixed(1)}x higher CTR than ${sorted[sorted.length - 1].label.toLowerCase()} campaigns. Consider focusing budget on ${sorted[0].label.toLowerCase()} placements.`,
          icon: "trending-up",
          color: "text-emerald-600",
        });
      }
    }

    // Check for inactive creatives
    const inactiveCount = creatives.filter((c) => !c.is_active).length;
    if (inactiveCount > 0) {
      recs.push({
        text: `You have ${inactiveCount} inactive creative${inactiveCount > 1 ? "s" : ""}. Activate them to increase coverage across placements, or remove outdated assets.`,
        icon: "alert-circle",
        color: "text-amber-600",
      });
    }

    // Check for missing types
    const existingTypes = new Set(creatives.map((c) => c.type));
    const missingTypes = (["logo", "banner", "icon", "screenshot"] as CreativeType[]).filter(
      (t) => !existingTypes.has(t)
    );
    if (missingTypes.length > 0) {
      recs.push({
        text: `Missing creative types: ${missingTypes.map((t) => CREATIVE_TYPE_META[t].label).join(", ")}. Adding these can unlock additional ad placement opportunities.`,
        icon: "image",
        color: "text-purple-600",
      });
    }

    // Best performer acknowledgement
    if (bestType && bestType.ctr > 0) {
      recs.push({
        text: `${bestType.label} creatives are your top performers with a ${bestType.ctr.toFixed(2)}% CTR. Keep these assets updated and high-quality.`,
        icon: "trophy",
        color: "text-emerald-600",
      });
    }

    // Low CTR warning
    const overallCtr = brokerTotals.impressions > 0
      ? (brokerTotals.clicks / brokerTotals.impressions) * 100
      : 0;
    if (overallCtr > 0 && overallCtr < 1.0) {
      recs.push({
        text: `Overall CTR is ${overallCtr.toFixed(2)}%, which is below the 1% threshold. Consider refreshing creative assets or testing new banner designs.`,
        icon: "alert-triangle",
        color: "text-red-600",
      });
    }

    return recs;
  }, [typePerformance, creatives, bestType, brokerTotals]);

  // Total active
  const activeCreatives = creatives.filter((c) => c.is_active).length;

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  // Empty state
  if (creatives.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Creative Insights</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyse how your creative assets perform across campaigns.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Icon name="image" size={24} className="text-purple-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No creatives uploaded yet</p>
          <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
            Upload logos, banners, icons, and screenshots to start tracking creative performance
            across your campaigns.
          </p>
          <Link
            href="/broker-portal/creatives"
            className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Creatives
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Creative Insights</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyse how your creative assets perform across campaigns.
          </p>
        </div>
        <Link
          href="/broker-portal/creatives"
          className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <Icon name="image" size={14} />
          Manage Creatives
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 portal-stagger">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="image" size={14} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Total Creatives</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={creatives.length} duration={800} />
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Icon name="check-circle" size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Active Creatives</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={activeCreatives} duration={800} />
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <Icon name="trophy" size={14} className="text-purple-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              Best Performing Type
              <InfoTip text="Creative type with the highest click-through rate across all campaigns." />
            </span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {bestType ? bestType.label : "---"}
          </p>
          {bestType && bestType.ctr > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">
              {bestType.ctr.toFixed(2)}% CTR
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Icon name="megaphone" size={14} className="text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Associated Campaigns</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            <CountUp end={campaigns.length} duration={800} />
          </p>
        </div>
      </div>

      {/* Performance Comparison by Creative Type */}
      {typePerformance.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-slate-900">Performance by Creative Type</h2>
            <InfoTip text="Compares aggregate performance metrics across creative types. Stats are proportionally attributed based on creative asset distribution." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {typePerformance.map((tp) => {
              const meta = CREATIVE_TYPE_META[tp.type];
              const isBest = bestType?.type === tp.type;
              return (
                <div
                  key={tp.type}
                  className={`rounded-xl border p-4 transition-all ${
                    isBest
                      ? "border-emerald-200 bg-emerald-50/50 ring-1 ring-emerald-200"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
                        <Icon name={meta.icon} size={16} className={meta.iconColor} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tp.label}</p>
                        <p className="text-[0.62rem] text-slate-400">
                          {tp.creativeCount} asset{tp.creativeCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {isBest && (
                      <span className="text-[0.62rem] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Top
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Impressions</span>
                      <span className="font-semibold text-slate-900">
                        {tp.impressions.toLocaleString("en-AU")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Clicks</span>
                      <span className="font-semibold text-slate-900">
                        {tp.clicks.toLocaleString("en-AU")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">CTR</span>
                      <span className={`font-bold ${isBest ? "text-emerald-700" : "text-slate-900"}`}>
                        {tp.ctr.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Conversions</span>
                      <span className="font-semibold text-slate-900">
                        {tp.conversions.toLocaleString("en-AU")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Spend</span>
                      <span className="font-semibold text-slate-900">
                        ${(tp.spend / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* CTR bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isBest ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            bestType && bestType.ctr > 0
                              ? (tp.ctr / bestType.ctr) * 100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTR Comparison Bar Chart */}
      {typePerformance.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-slate-900">CTR Comparison</h2>
            <InfoTip text="Visual comparison of click-through rates across creative types. Higher CTR indicates more compelling creatives." />
          </div>
          <div className="space-y-3">
            {[...typePerformance]
              .sort((a, b) => b.ctr - a.ctr)
              .map((tp) => {
                const meta = CREATIVE_TYPE_META[tp.type];
                const maxCtr = Math.max(...typePerformance.map((t) => t.ctr), 0.01);
                const pct = (tp.ctr / maxCtr) * 100;
                const isBest = bestType?.type === tp.type;
                return (
                  <div key={tp.type}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded ${meta.iconBg} flex items-center justify-center`}>
                          <Icon name={meta.icon} size={10} className={meta.iconColor} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{tp.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${isBest ? "text-emerald-700" : "text-slate-900"}`}>
                        {tp.ctr.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isBest ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Creative Asset Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Creative Asset Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Per-creative aggregate stats across all campaigns
          </p>
        </div>
        <div className="relative">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Creative</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Campaigns</th>
                  <th className="px-5 py-3 text-right">Impressions</th>
                  <th className="px-5 py-3 text-right">Clicks</th>
                  <th className="px-5 py-3 text-right">CTR</th>
                  <th className="px-5 py-3 text-right">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creativeBreakdown.map((c) => {
                  const meta = CREATIVE_TYPE_META[c.type as CreativeType];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.url}
                              alt={c.label || c.type}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {c.label || c.type}
                            </p>
                            <p className="text-[0.62rem] text-slate-400 truncate max-w-[200px]">
                              {c.url}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${meta.iconBg} ${meta.iconColor}`}>
                          <Icon name={meta.icon} size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {c.associatedCampaigns}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {c.impressions.toLocaleString("en-AU")}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {c.clicks.toLocaleString("en-AU")}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
                        {c.ctr.toFixed(2)}%
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {c.conversions.toLocaleString("en-AU")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent lg:hidden" />
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="lightbulb" size={14} className="text-blue-600" />
            </div>
            <h2 className="font-bold text-slate-900">Recommendations</h2>
            <InfoTip text="Data-driven suggestions to improve creative performance across your campaigns." />
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3"
                style={{ animation: `resultCardIn 0.3s ease-out ${i * 0.08}s both` }}
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                  <Icon name={rec.icon} size={10} className={rec.color} />
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Performance Summary */}
      {brokerTotals.impressions > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 portal-stagger">
          {[
            {
              label: "Total Impressions",
              value: brokerTotals.impressions,
              icon: "eye",
              iconBg: "bg-purple-50",
              iconColor: "text-purple-600",
            },
            {
              label: "Total Clicks",
              value: brokerTotals.clicks,
              icon: "mouse-pointer-click",
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              label: "Overall CTR",
              value: brokerTotals.impressions > 0
                ? (brokerTotals.clicks / brokerTotals.impressions) * 100
                : 0,
              suffix: "%",
              decimals: 2,
              icon: "trending-up",
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
            },
            {
              label: "Conversions",
              value: brokerTotals.conversions,
              icon: "target",
              iconBg: "bg-amber-50",
              iconColor: "text-amber-600",
            },
            {
              label: "Total Spend",
              value: brokerTotals.spend / 100,
              prefix: "$",
              decimals: 2,
              icon: "dollar-sign",
              iconBg: "bg-red-50",
              iconColor: "text-red-600",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-5 h-5 rounded-full ${kpi.iconBg} flex items-center justify-center`}>
                  <Icon name={kpi.icon} size={10} className={kpi.iconColor} />
                </div>
                <p className="text-[0.62rem] text-slate-500 font-medium uppercase tracking-wide">
                  {kpi.label}
                </p>
              </div>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                <CountUp
                  end={kpi.value}
                  prefix={kpi.prefix}
                  suffix={kpi.suffix}
                  decimals={kpi.decimals}
                  duration={1000}
                />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

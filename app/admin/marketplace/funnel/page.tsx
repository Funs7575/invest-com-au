"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";
import SVGFunnel from "@/components/charts/SVGFunnel";
import SVGBarChart from "@/components/charts/SVGBarChart";
import SVGLineChart from "@/components/charts/SVGLineChart";
import CountUp from "@/components/CountUp";
import Sparkline from "@/components/Sparkline";
import InfoTip from "@/components/InfoTip";

/* ─────────────────────── Types ─────────────────────── */

type DateRange = "7d" | "30d" | "90d" | "all";
type Tab = "funnel" | "dropoff" | "cohorts" | "brokers";

interface CampaignEvent {
  event_type: string;
  campaign_id: number | null;
  broker_slug: string | null;
  page: string | null;
  device_type: string | null;
  placement_id: number | null;
  placement_slug: string | null;
  amount_cents: number;
  cost_cents: number;
  created_at: string;
}

interface Campaign {
  id: number;
  broker_slug: string;
  name: string;
}

interface Placement {
  id: number;
  slug: string;
  name: string;
}

interface DailyStat {
  campaign_id: number;
  broker_slug: string;
  stat_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
}

interface BrokerAccount {
  broker_slug: string;
  company_name: string;
}

interface FunnelMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  clickToConv: number;
  cpc: number;
  spend: number;
}

interface PlacementFunnel {
  slug: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  clickToConv: number;
}

interface DropoffRow {
  slug: string;
  name: string;
  stage1: number;
  stage2: number;
  dropoff: number;
  deltaVsAvg: number;
}

interface WeeklyCohort {
  weekLabel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  convRate: number;
  trend: number[];
}

interface BrokerFunnel {
  broker_slug: string;
  company_name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  clickToConv: number;
  spend: number;
  cpc: number;
}

/* ─────────────────────── Constants ─────────────────────── */

const TABS: { value: Tab; label: string }[] = [
  { value: "funnel", label: "Conversion Funnel" },
  { value: "dropoff", label: "Drop-off Analysis" },
  { value: "cohorts", label: "Cohort Trends" },
  { value: "brokers", label: "Broker Funnels" },
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

/* ─────────────────────── Helpers ─────────────────────── */

function pct(num: number, den: number): number {
  return den > 0 ? (num / den) * 100 : 0;
}

function fmtPct(v: number): string {
  return v.toFixed(2) + "%";
}

function fmtCurrency(cents: number): string {
  const dollars = cents / 100;
  return dollars >= 1000 ? `$${(dollars / 1000).toFixed(1)}k` : `$${dollars.toFixed(2)}`;
}

function fmtCpc(spendCents: number, clicks: number): string {
  if (clicks === 0) return "$0.00";
  return `$${(spendCents / 100 / clicks).toFixed(2)}`;
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `W${weekNum} ${d.getFullYear()}`;
}

function getDateFrom(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/* ─────────────────────── Component ─────────────────────── */

export default function FunnelAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("funnel");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>("conversions");
  const [sortAsc, setSortAsc] = useState(false);

  // Core data
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);

  // Broker funnels tab state
  const [brokerA, setBrokerA] = useState<string>("");
  const [brokerB, setBrokerB] = useState<string>("");

  /* ─────────── Data fetching ─────────── */

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const dateFrom = getDateFrom(dateRange);

    let eventsQuery = supabase
      .from("campaign_events")
      .select("event_type, campaign_id, broker_slug, page, device_type, placement_id, placement_slug, amount_cents, cost_cents, created_at")
      .order("created_at", { ascending: false });
    if (dateFrom) eventsQuery = eventsQuery.gte("created_at", dateFrom);

    let dailyQuery = supabase
      .from("campaign_daily_stats")
      .select("campaign_id, broker_slug, stat_date, impressions, clicks, conversions, spend_cents")
      .order("stat_date", { ascending: true });
    if (dateFrom) dailyQuery = dailyQuery.gte("stat_date", dateFrom.split("T")[0]);

    const [eventsRes, campaignsRes, placementsRes, dailyRes, brokersRes] = await Promise.all([
      eventsQuery,
      supabase.from("campaigns").select("id, broker_slug, name"),
      supabase.from("marketplace_placements").select("id, slug, name"),
      dailyQuery,
      supabase.from("broker_accounts").select("broker_slug, company_name"),
    ]);

    setEvents((eventsRes.data || []) as CampaignEvent[]);
    setCampaigns((campaignsRes.data || []) as Campaign[]);
    setPlacements((placementsRes.data || []) as Placement[]);
    setDailyStats((dailyRes.data || []) as DailyStat[]);
    setBrokerAccounts((brokersRes.data || []) as BrokerAccount[]);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─────────── Derived data: overall funnel ─────────── */

  const overallFunnel: FunnelMetrics = (() => {
    let impressions = 0, clicks = 0, conversions = 0, spend = 0;
    events.forEach((e) => {
      if (e.event_type === "impression") impressions++;
      else if (e.event_type === "click") clicks++;
      else if (e.event_type === "conversion") conversions++;
      spend += e.amount_cents || 0;
    });
    return {
      impressions,
      clicks,
      conversions,
      ctr: pct(clicks, impressions),
      clickToConv: pct(conversions, clicks),
      cpc: clicks > 0 ? spend / clicks : 0,
      spend,
    };
  })();

  /* ─────────── Derived data: placement funnels ─────────── */

  const placementNameMap: Record<string, string> = {};
  placements.forEach((p) => { placementNameMap[p.slug] = p.name; });

  const placementFunnels: PlacementFunnel[] = (() => {
    const map: Record<string, { impressions: number; clicks: number; conversions: number }> = {};
    events.forEach((e) => {
      const slug = e.placement_slug || `placement-${e.placement_id || "unknown"}`;
      if (!map[slug]) map[slug] = { impressions: 0, clicks: 0, conversions: 0 };
      if (e.event_type === "impression") map[slug].impressions++;
      else if (e.event_type === "click") map[slug].clicks++;
      else if (e.event_type === "conversion") map[slug].conversions++;
    });
    return Object.entries(map)
      .map(([slug, s]) => ({
        slug,
        name: placementNameMap[slug] || slug,
        ...s,
        ctr: pct(s.clicks, s.impressions),
        clickToConv: pct(s.conversions, s.clicks),
      }))
      .sort((a, b) => b.impressions - a.impressions);
  })();

  /* ─────────── Derived data: drop-off analysis ─────────── */

  const buildDropoffRows = (stage1Key: "impressions" | "clicks", stage2Key: "clicks" | "conversions"): DropoffRow[] => {
    const rows = placementFunnels.map((p) => {
      const s1 = p[stage1Key];
      const s2 = p[stage2Key];
      const dropoff = s1 > 0 ? pct(s1 - s2, s1) : 0;
      return { slug: p.slug, name: p.name, stage1: s1, stage2: s2, dropoff, deltaVsAvg: 0 };
    });
    const avgDropoff = rows.length > 0 ? rows.reduce((s, r) => s + r.dropoff, 0) / rows.length : 0;
    rows.forEach((r) => { r.deltaVsAvg = r.dropoff - avgDropoff; });
    return rows.sort((a, b) => b.dropoff - a.dropoff);
  };

  const impressionToClickDropoff = buildDropoffRows("impressions", "clicks");
  const clickToConvDropoff = buildDropoffRows("clicks", "conversions");

  /* ─────────── Derived data: cohort trends ─────────── */

  const dailyTrendData = (() => {
    const dayMap: Record<string, { impressions: number; clicks: number; conversions: number }> = {};
    dailyStats.forEach((d) => {
      if (!dayMap[d.stat_date]) dayMap[d.stat_date] = { impressions: 0, clicks: 0, conversions: 0 };
      dayMap[d.stat_date].impressions += d.impressions;
      dayMap[d.stat_date].clicks += d.clicks;
      dayMap[d.stat_date].conversions += d.conversions;
    });
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, s]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
        impressions: s.impressions,
        clicks: s.clicks,
        conversions: s.conversions,
        ctr: pct(s.clicks, s.impressions),
        convRate: pct(s.conversions, s.clicks),
      }));
  })();

  const weeklyCohorts: WeeklyCohort[] = (() => {
    const weekMap: Record<string, { impressions: number; clicks: number; conversions: number; dailyCtr: number[] }> = {};
    dailyStats.forEach((d) => {
      const wk = getWeekLabel(d.stat_date);
      if (!weekMap[wk]) weekMap[wk] = { impressions: 0, clicks: 0, conversions: 0, dailyCtr: [] };
      weekMap[wk].impressions += d.impressions;
      weekMap[wk].clicks += d.clicks;
      weekMap[wk].conversions += d.conversions;
      weekMap[wk].dailyCtr.push(pct(d.clicks, d.impressions));
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekLabel, s]) => ({
        weekLabel,
        ...s,
        ctr: pct(s.clicks, s.impressions),
        convRate: pct(s.conversions, s.clicks),
        trend: s.dailyCtr,
      }));
  })();

  /* ─────────── Derived data: broker funnels ─────────── */

  const brokerNameMap: Record<string, string> = {};
  brokerAccounts.forEach((b) => { brokerNameMap[b.broker_slug] = b.company_name; });

  const brokerFunnels: BrokerFunnel[] = (() => {
    const map: Record<string, { impressions: number; clicks: number; conversions: number; spend: number }> = {};
    events.forEach((e) => {
      const slug = e.broker_slug || "unknown";
      if (!map[slug]) map[slug] = { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
      if (e.event_type === "impression") map[slug].impressions++;
      else if (e.event_type === "click") map[slug].clicks++;
      else if (e.event_type === "conversion") map[slug].conversions++;
      map[slug].spend += e.amount_cents || 0;
    });
    return Object.entries(map)
      .map(([broker_slug, s]) => ({
        broker_slug,
        company_name: brokerNameMap[broker_slug] || broker_slug,
        ...s,
        ctr: pct(s.clicks, s.impressions),
        clickToConv: pct(s.conversions, s.clicks),
        cpc: s.clicks > 0 ? s.spend / s.clicks : 0,
      }))
      .sort((a, b) => b.clickToConv - a.clickToConv);
  })();

  const selectedBrokerA = brokerFunnels.find((b) => b.broker_slug === brokerA);
  const selectedBrokerB = brokerFunnels.find((b) => b.broker_slug === brokerB);

  // Set default broker selections once data loads
  useEffect(() => {
    if (brokerFunnels.length > 0 && !brokerA) {
      setBrokerA(brokerFunnels[0].broker_slug);
      if (brokerFunnels.length > 1) setBrokerB(brokerFunnels[1].broker_slug);
    }
  }, [brokerFunnels.length]);

  /* ─────────── Sort helper ─────────── */

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIcon = (key: string) =>
    sortKey === key ? (sortAsc ? " \u25B2" : " \u25BC") : "";

  function sortedRows<T>(rows: T[], key: string): T[] {
    return [...rows].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[key];
      const bVal = (b as Record<string, unknown>)[key];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  /* ─────────── CSV Export ─────────── */

  const handleExportCSV = () => {
    if (activeTab === "funnel") {
      const rows = placementFunnels.map((p) => [
        p.name, String(p.impressions), String(p.clicks), String(p.conversions),
        fmtPct(p.ctr), fmtPct(p.clickToConv),
      ]);
      rows.unshift([
        "Overall", String(overallFunnel.impressions), String(overallFunnel.clicks),
        String(overallFunnel.conversions), fmtPct(overallFunnel.ctr), fmtPct(overallFunnel.clickToConv),
      ]);
      downloadCSV("funnel-conversion.csv",
        ["Placement", "Impressions", "Clicks", "Conversions", "CTR", "Click-to-Conv"],
        rows,
      );
    } else if (activeTab === "dropoff") {
      const rows = impressionToClickDropoff.map((r) => [
        r.name, String(r.stage1), String(r.stage2), fmtPct(r.dropoff), fmtPct(r.deltaVsAvg),
      ]);
      downloadCSV("funnel-dropoff.csv",
        ["Placement", "Impressions", "Clicks", "Drop-off %", "Delta vs Avg"],
        rows,
      );
    } else if (activeTab === "cohorts") {
      const rows = weeklyCohorts.map((c) => [
        c.weekLabel, String(c.impressions), String(c.clicks), String(c.conversions),
        fmtPct(c.ctr), fmtPct(c.convRate),
      ]);
      downloadCSV("funnel-cohorts.csv",
        ["Week", "Impressions", "Clicks", "Conversions", "CTR", "Conv Rate"],
        rows,
      );
    } else if (activeTab === "brokers") {
      const rows = brokerFunnels.map((b) => [
        b.company_name, String(b.impressions), String(b.clicks), String(b.conversions),
        fmtPct(b.ctr), fmtPct(b.clickToConv), fmtCurrency(b.spend), fmtCpc(b.spend, b.clicks),
      ]);
      downloadCSV("funnel-brokers.csv",
        ["Broker", "Impressions", "Clicks", "Conversions", "CTR", "Click-to-Conv", "Spend", "CPC"],
        rows,
      );
    }
  };

  /* ─────────── Skeleton components ─────────── */

  const SkeletonCard = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
      <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-24 bg-slate-200 rounded" />
    </div>
  );

  const SkeletonRows = ({ count = 5 }: { count?: number }) => (
    <div className="p-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex justify-between gap-4">
          <div className="h-4 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );

  const SkeletonChart = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-6 animate-pulse">
      <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded" />
    </div>
  );

  /* ─────────── Empty state ─────────── */

  const isEmpty = events.length === 0 && dailyStats.length === 0;

  const EmptyState = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
      <div className="text-4xl mb-3">🔬</div>
      <p className="text-sm text-slate-400">No funnel data available for this date range.</p>
    </div>
  );

  /* ─────────── Render: Broker Funnel Card ─────────── */

  const BrokerFunnelCard = ({ broker, label }: { broker: BrokerFunnel | undefined; label: string }) => {
    if (!broker) return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-400">
        Select a broker to view funnel
      </div>
    );
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">{label}: {broker.company_name}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600"><CountUp end={broker.impressions} /></div>
              <div className="text-xs text-slate-500">Impressions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-600"><CountUp end={broker.clicks} /></div>
              <div className="text-xs text-slate-500">Clicks</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-600"><CountUp end={broker.conversions} /></div>
              <div className="text-xs text-slate-500">Conversions</div>
            </div>
          </div>
          <SVGFunnel
            stages={[
              { label: "Impressions", value: broker.impressions, color: "#3b82f6" },
              { label: "Clicks", value: broker.clicks, color: "#f59e0b" },
              { label: "Conversions", value: broker.conversions, color: "#10b981" },
            ]}
            width={400}
            stageHeight={40}
          />
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-sm font-semibold text-slate-900">{fmtPct(broker.ctr)}</div>
              <div className="text-xs text-slate-500">CTR</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{fmtPct(broker.clickToConv)}</div>
              <div className="text-xs text-slate-500">Click-to-Conv</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────── Render: Drop-off table ─────────── */

  const DropoffTable = ({
    title,
    stage1Label,
    stage2Label,
    rows,
  }: {
    title: string;
    stage1Label: string;
    stage2Label: string;
    rows: DropoffRow[];
  }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">No data available.</div>
      ) : (
        <>
          <div className="p-4">
            <SVGBarChart
              data={rows.slice(0, 10).map((r) => ({
                label: r.name,
                value: r.dropoff,
                color: r.deltaVsAvg > 5 ? "#ef4444" : r.deltaVsAvg < -5 ? "#10b981" : "#f59e0b",
              }))}
              formatValue={(v) => fmtPct(v)}
              width={520}
              barHeight={24}
            />
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Placement</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">{stage1Label}</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">{stage2Label}</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Drop-off %</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Delta vs Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((r) => (
                  <tr key={r.slug} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm text-slate-900 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-slate-600">{r.stage1.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-slate-600">{r.stage2.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 text-sm text-right font-semibold ${r.dropoff > 80 ? "text-red-600" : r.dropoff < 40 ? "text-emerald-600" : "text-amber-600"}`}>
                      {fmtPct(r.dropoff)}
                    </td>
                    <td className={`px-4 py-2.5 text-sm text-right font-medium ${r.deltaVsAvg > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {r.deltaVsAvg > 0 ? "+" : ""}{fmtPct(r.deltaVsAvg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════ */
  /* ═══════════════════════ RENDER ════════════════════════ */
  /* ═══════════════════════════════════════════════════════ */

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Funnel Analytics</h1>
            <p className="text-sm text-slate-500">
              Visualise the impression-to-conversion funnel across placements and brokers.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            Export CSV
          </button>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-amber-500 text-white"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Date Range Filter ─── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Range:</span>
          {DATE_RANGES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                dateRange === opt.value
                  ? "bg-amber-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ═════════════════ TAB 1: CONVERSION FUNNEL ═════════════════ */}
        {activeTab === "funnel" && (
          <>
            {loading ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
                <SkeletonChart />
              </>
            ) : isEmpty ? (
              <EmptyState />
            ) : (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      <CountUp end={overallFunnel.impressions} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Impressions <InfoTip text="Total number of ad impressions served in the selected period." />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-amber-600">
                      <CountUp end={overallFunnel.clicks} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Clicks <InfoTip text="Total unique clicks on marketplace ads." />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-600">
                      <CountUp end={overallFunnel.conversions} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Conversions <InfoTip text="Actions attributed to ad clicks (sign-ups, applications, etc.)." />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{fmtPct(overallFunnel.ctr)}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Overall CTR <InfoTip text="Click-through rate: clicks / impressions." />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-600">{fmtPct(overallFunnel.clickToConv)}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Click-to-Conv <InfoTip text="Conversion rate: conversions / clicks." />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{fmtCpc(overallFunnel.spend, overallFunnel.clicks)}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      CPC <InfoTip text="Cost per click: total spend / total clicks." />
                    </div>
                  </div>
                </div>

                {/* Main funnel visualization */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Overall Conversion Funnel</h2>
                  </div>
                  <div className="p-6 flex justify-center">
                    <SVGFunnel
                      stages={[
                        { label: "Impressions", value: overallFunnel.impressions, color: "#3b82f6" },
                        { label: "Clicks", value: overallFunnel.clicks, color: "#f59e0b" },
                        { label: "Conversions", value: overallFunnel.conversions, color: "#10b981" },
                      ]}
                      width={520}
                      stageHeight={56}
                    />
                  </div>
                </div>

                {/* Placement breakdown funnels */}
                {placementFunnels.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h2 className="text-lg font-semibold text-slate-900">Funnel by Placement</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {placementFunnels.map((p) => (
                        <div key={p.slug} className="border border-slate-100 rounded-lg p-4">
                          <div className="text-sm font-semibold text-slate-800 mb-2 truncate" title={p.name}>
                            {p.name}
                          </div>
                          <SVGFunnel
                            stages={[
                              { label: "Impr.", value: p.impressions, color: "#3b82f6" },
                              { label: "Clicks", value: p.clicks, color: "#f59e0b" },
                              { label: "Conv.", value: p.conversions, color: "#10b981" },
                            ]}
                            width={320}
                            stageHeight={36}
                            gap={3}
                          />
                          <div className="mt-2 flex justify-between text-xs text-slate-500">
                            <span>CTR: <span className="font-semibold text-slate-700">{fmtPct(p.ctr)}</span></span>
                            <span>Conv: <span className="font-semibold text-slate-700">{fmtPct(p.clickToConv)}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═════════════════ TAB 2: DROP-OFF ANALYSIS ═════════════════ */}
        {activeTab === "dropoff" && (
          <>
            {loading ? (
              <>
                <SkeletonChart />
                <SkeletonRows count={6} />
              </>
            ) : isEmpty ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                <DropoffTable
                  title="Impression \u2192 Click Drop-off"
                  stage1Label="Impressions"
                  stage2Label="Clicks"
                  rows={impressionToClickDropoff}
                />
                <DropoffTable
                  title="Click \u2192 Conversion Drop-off"
                  stage1Label="Clicks"
                  stage2Label="Conversions"
                  rows={clickToConvDropoff}
                />
              </div>
            )}
          </>
        )}

        {/* ═════════════════ TAB 3: COHORT TRENDS ═════════════════ */}
        {activeTab === "cohorts" && (
          <>
            {loading ? (
              <>
                <SkeletonChart />
                <SkeletonRows count={8} />
              </>
            ) : isEmpty ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {/* Dual-axis line chart (rendered as two overlaid line charts) */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Daily Funnel Rates</h2>
                    <p className="text-xs text-slate-400 mt-0.5">CTR and click-to-conversion rate over time</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
                        <span className="text-xs text-slate-500 font-medium">CTR (%)</span>
                      </div>
                      <SVGLineChart
                        data={dailyTrendData.map((d) => ({ label: d.label, value: d.ctr }))}
                        color="#3b82f6"
                        height={180}
                        width={640}
                        formatValue={(v) => fmtPct(v)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
                        <span className="text-xs text-slate-500 font-medium">Click-to-Conversion Rate (%)</span>
                      </div>
                      <SVGLineChart
                        data={dailyTrendData.map((d) => ({ label: d.label, value: d.convRate }))}
                        color="#10b981"
                        height={180}
                        width={640}
                        formatValue={(v) => fmtPct(v)}
                      />
                    </div>
                  </div>
                </div>

                {/* Weekly cohort table */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Weekly Cohorts</h2>
                  </div>
                  {weeklyCohorts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">No weekly data available.</div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Week</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Impressions</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Clicks</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Conversions</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">CTR</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Conv Rate</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {weeklyCohorts.map((c) => (
                            <tr key={c.weekLabel} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-sm text-slate-900 font-medium">{c.weekLabel}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-blue-600">{c.impressions.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-amber-600">{c.clicks.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-emerald-600 font-semibold">{c.conversions.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-slate-600">{fmtPct(c.ctr)}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-slate-600">{fmtPct(c.convRate)}</td>
                              <td className="px-4 py-2.5 text-center">
                                {c.trend.length >= 2 ? (
                                  <Sparkline
                                    data={c.trend}
                                    width={72}
                                    height={20}
                                    color={c.trend[c.trend.length - 1] >= c.trend[0] ? "#10b981" : "#ef4444"}
                                  />
                                ) : (
                                  <span className="text-xs text-slate-300">--</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═════════════════ TAB 4: BROKER FUNNELS ═════════════════ */}
        {activeTab === "brokers" && (
          <>
            {loading ? (
              <>
                <SkeletonChart />
                <SkeletonRows count={6} />
              </>
            ) : isEmpty ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {/* Broker comparison selectors */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Broker A</label>
                      <select
                        value={brokerA}
                        onChange={(e) => setBrokerA(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="">Select broker...</option>
                        {brokerFunnels.map((b) => (
                          <option key={b.broker_slug} value={b.broker_slug}>
                            {b.company_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-slate-400 font-medium pb-2.5">vs</div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Broker B</label>
                      <select
                        value={brokerB}
                        onChange={(e) => setBrokerB(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="">Select broker...</option>
                        {brokerFunnels.map((b) => (
                          <option key={b.broker_slug} value={b.broker_slug}>
                            {b.company_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Side-by-side broker funnels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BrokerFunnelCard broker={selectedBrokerA} label="Broker A" />
                  <BrokerFunnelCard broker={selectedBrokerB} label="Broker B" />
                </div>

                {/* All brokers ranked by conversion rate */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">All Brokers by Conversion Rate</h2>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("company_name")} className="hover:text-slate-700">
                              Broker{sortIcon("company_name")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("impressions")} className="hover:text-slate-700">
                              Impressions{sortIcon("impressions")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("clicks")} className="hover:text-slate-700">
                              Clicks{sortIcon("clicks")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("conversions")} className="hover:text-slate-700">
                              Conv.{sortIcon("conversions")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("ctr")} className="hover:text-slate-700">
                              CTR{sortIcon("ctr")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("clickToConv")} className="hover:text-slate-700">
                              Conv Rate{sortIcon("clickToConv")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("spend")} className="hover:text-slate-700">
                              Spend{sortIcon("spend")}
                            </button>
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                            <button onClick={() => handleSort("cpc")} className="hover:text-slate-700">
                              CPC{sortIcon("cpc")}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sortedRows(brokerFunnels, sortKey).map((b, idx) => (
                          <tr key={b.broker_slug} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-sm text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}.</span>
                                <span className="font-medium">{b.company_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right text-blue-600">{b.impressions.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-amber-600">{b.clicks.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-emerald-600 font-semibold">{b.conversions.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-slate-600">{fmtPct(b.ctr)}</td>
                            <td className={`px-4 py-2.5 text-sm text-right font-semibold ${
                              b.clickToConv >= 10 ? "text-emerald-600" : b.clickToConv >= 3 ? "text-amber-600" : "text-red-500"
                            }`}>
                              {fmtPct(b.clickToConv)}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right text-slate-600">{fmtCurrency(b.spend)}</td>
                            <td className="px-4 py-2.5 text-sm text-right text-purple-600">{fmtCpc(b.spend, b.clicks)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100">
                        <tr>
                          <td className="px-4 py-2 text-sm font-semibold text-slate-900 pl-11">Total</td>
                          <td className="px-4 py-2 text-sm text-right text-blue-700 font-bold">{overallFunnel.impressions.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-right text-amber-700 font-bold">{overallFunnel.clicks.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-right text-emerald-700 font-bold">{overallFunnel.conversions.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">{fmtPct(overallFunnel.ctr)}</td>
                          <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">{fmtPct(overallFunnel.clickToConv)}</td>
                          <td className="px-4 py-2 text-sm text-right text-slate-700 font-bold">{fmtCurrency(overallFunnel.spend)}</td>
                          <td className="px-4 py-2 text-sm text-right text-purple-700 font-bold">{fmtCpc(overallFunnel.spend, overallFunnel.clicks)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

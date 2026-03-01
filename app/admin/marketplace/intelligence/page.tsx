"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import SVGBarChart from "@/components/charts/SVGBarChart";
import SVGDonutChart from "@/components/charts/SVGDonutChart";
import SVGLineChart from "@/components/charts/SVGLineChart";
import Sparkline from "@/components/Sparkline";
import CountUp from "@/components/CountUp";
import InfoTip from "@/components/InfoTip";

/* ─────────────────────── Types ─────────────────────── */

interface BrokerScorecard {
  broker_slug: string;
  company_name: string;
  status: string;
  activeCampaigns: number;
  totalCampaigns: number;
  totalSpendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  avgCpc: number;
  walletBalanceCents: number;
  healthGrade: "A" | "B" | "C" | "D" | "F";
  healthScore: number;
  trendData: number[];
  lastLoginAt: string | null;
  lastActivityAt: string | null;
}

interface ConsultingInsight {
  id: string;
  broker_slug: string;
  company_name: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

interface PortfolioKPIs {
  activeCampaigns: number;
  totalSpendCents: number;
  platformCTR: number;
  totalImpressions: number;
  totalClicks: number;
  avgCPC: number;
  activeBrokers: number;
  totalConversions: number;
}

type Tab = "portfolio" | "scorecard" | "insights" | "revenue" | "heatmap";
type DateRange = "7d" | "30d" | "90d";

/* ─────────────────────── Constants ─────────────────────── */

const TABS: { value: Tab; label: string }[] = [
  { value: "portfolio", label: "Portfolio Overview" },
  { value: "scorecard", label: "Broker Scorecard" },
  { value: "insights", label: "Consulting Insights" },
  { value: "revenue", label: "Revenue Analytics" },
  { value: "heatmap", label: "Performance Heatmap" },
];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-orange-100 text-orange-800",
  F: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
};

const PLACEMENT_COLORS = [
  "#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed",
  "#059669", "#0891b2", "#e11d48", "#4f46e5", "#ca8a04",
];

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

/* ─────────────────────── Health Grade ─────────────────────── */

function calculateHealthGrade(b: {
  ctr: number;
  conversionRate: number;
  walletBalanceCents: number;
  activeCampaigns: number;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  dailySpendTrend: number[];
  platformAvgCTR: number;
  platformAvgConvRate: number;
}): { grade: "A" | "B" | "C" | "D" | "F"; score: number } {
  let score = 0;

  // 1. CTR vs platform avg (25 pts)
  const ctrRatio = b.platformAvgCTR > 0 ? b.ctr / b.platformAvgCTR : 0;
  if (ctrRatio >= 1.5) score += 25;
  else if (ctrRatio >= 1.0) score += 20;
  else if (ctrRatio >= 0.7) score += 15;
  else if (ctrRatio >= 0.4) score += 8;

  // 2. Conversion rate (20 pts)
  const convRatio = b.platformAvgConvRate > 0 ? b.conversionRate / b.platformAvgConvRate : 0;
  if (convRatio >= 1.5) score += 20;
  else if (convRatio >= 1.0) score += 16;
  else if (convRatio >= 0.5) score += 10;
  else if (convRatio > 0) score += 5;

  // 3. Wallet balance (20 pts)
  if (b.walletBalanceCents >= 10000) score += 20;
  else if (b.walletBalanceCents >= 5000) score += 15;
  else if (b.walletBalanceCents >= 1000) score += 10;
  else if (b.walletBalanceCents > 0) score += 5;

  // 4. Activity recency (20 pts)
  const lastActive = b.lastActivityAt || b.lastLoginAt;
  if (lastActive) {
    const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
    if (daysSince <= 1) score += 20;
    else if (daysSince <= 3) score += 16;
    else if (daysSince <= 7) score += 12;
    else if (daysSince <= 14) score += 6;
  }

  // 5. Spend momentum (15 pts)
  const trend = b.dailySpendTrend;
  if (trend.length >= 4) {
    const mid = Math.floor(trend.length / 2);
    const avgFirst = trend.slice(0, mid).reduce((a, v) => a + v, 0) / mid;
    const avgSecond = trend.slice(mid).reduce((a, v) => a + v, 0) / (trend.length - mid);
    if (avgSecond > avgFirst * 1.1) score += 15;
    else if (avgSecond >= avgFirst * 0.9) score += 10;
    else if (avgSecond >= avgFirst * 0.5) score += 5;
  } else if (b.activeCampaigns > 0) {
    score += 8;
  }

  let grade: "A" | "B" | "C" | "D" | "F";
  if (score >= 80) grade = "A";
  else if (score >= 65) grade = "B";
  else if (score >= 45) grade = "C";
  else if (score >= 25) grade = "D";
  else grade = "F";

  return { grade, score };
}

/* ─────────────────────── Insight Generator ─────────────────────── */

function generateInsights(
  scorecards: BrokerScorecard[],
  campaigns: { id: number; broker_slug: string; placement_id: number; name: string; status: string; daily_budget_cents: number | null; total_budget_cents: number | null; total_spent_cents: number; }[],
  dailyStatsByBroker: Map<string, Map<string, { impressions: number; clicks: number; conversions: number; spend_cents: number }>>,
  creatives: { broker_slug: string; type: string; is_active: boolean; updated_at: string }[],
  placementMap: Map<number, string>,
  dailyStatsByCampaign: Map<number, { impressions: number; clicks: number; spend_cents: number }>,
  campaignPlacementMap: Map<number, number>,
): ConsultingInsight[] {
  const insights: ConsultingInsight[] = [];
  let idx = 0;

  for (const sc of scorecards) {
    const name = sc.company_name || sc.broker_slug;

    // 1. Churn Risk
    const lastActive = sc.lastActivityAt || sc.lastLoginAt;
    if (lastActive) {
      const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
      if (daysSince >= 14) {
        insights.push({
          id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
          severity: "critical", category: "Churn Risk",
          title: `Churn risk — ${name}`,
          description: `Last active ${daysSince} days ago. No recent logins or campaign activity. Consider proactive outreach before they churn.`,
          actionLabel: "View Account", actionHref: "/admin/marketplace/brokers",
        });
      } else if (daysSince >= 7 && sc.totalSpendCents > 0) {
        insights.push({
          id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
          severity: "critical", category: "Churn Risk",
          title: `Declining engagement — ${name}`,
          description: `Last active ${daysSince} days ago with declining spend. Send a check-in notification.`,
          actionLabel: "View Account", actionHref: "/admin/marketplace/brokers",
        });
      }
    }

    // 2. Low Wallet
    if (sc.walletBalanceCents < 1000 && sc.activeCampaigns > 0) {
      insights.push({
        id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
        severity: "critical", category: "Low Wallet",
        title: `Low wallet balance — ${name}`,
        description: `Wallet balance is $${(sc.walletBalanceCents / 100).toFixed(2)} with ${sc.activeCampaigns} active campaign(s). Campaigns will pause when balance hits $0.`,
        actionLabel: "View Wallet", actionHref: "/admin/marketplace/brokers",
      });
    }

    // 3. CTR Declining (week-over-week)
    const dailyData = dailyStatsByBroker.get(sc.broker_slug);
    if (dailyData && dailyData.size >= 10) {
      const dates = Array.from(dailyData.keys()).sort();
      const recentDates = dates.slice(-7);
      const priorDates = dates.slice(-14, -7);
      if (priorDates.length >= 3 && recentDates.length >= 3) {
        const recentImp = recentDates.reduce((s, d) => s + (dailyData.get(d)?.impressions || 0), 0);
        const recentClk = recentDates.reduce((s, d) => s + (dailyData.get(d)?.clicks || 0), 0);
        const priorImp = priorDates.reduce((s, d) => s + (dailyData.get(d)?.impressions || 0), 0);
        const priorClk = priorDates.reduce((s, d) => s + (dailyData.get(d)?.clicks || 0), 0);
        const recentCTR = recentImp > 0 ? (recentClk / recentImp) * 100 : 0;
        const priorCTR = priorImp > 0 ? (priorClk / priorImp) * 100 : 0;
        if (priorCTR > 0 && recentCTR < priorCTR * 0.8 && recentImp >= 50) {
          insights.push({
            id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
            severity: "warning", category: "CTR Declining",
            title: `CTR declining — ${name}`,
            description: `CTR dropped from ${priorCTR.toFixed(2)}% to ${recentCTR.toFixed(2)}% week-over-week (${((recentCTR - priorCTR) / priorCTR * 100).toFixed(0)}% change). Review ad relevance and creative freshness.`,
            actionLabel: "View Campaigns", actionHref: "/admin/marketplace/campaigns",
          });
        }
      }
    }

    // 4. Creative Fatigue
    const brokerCreatives = creatives.filter(c => c.broker_slug === sc.broker_slug && c.is_active);
    for (const cr of brokerCreatives) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(cr.updated_at).getTime()) / 86400000);
      if (daysSinceUpdate >= 30) {
        insights.push({
          id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
          severity: "warning", category: "Creative Fatigue",
          title: `Creative fatigue — ${name}`,
          description: `The "${cr.type}" creative has been running unchanged for ${daysSinceUpdate} days. Refreshing creatives typically improves CTR by 15-25%.`,
          actionLabel: "View Creatives", actionHref: "/admin/marketplace/brokers",
        });
        break; // One per broker
      }
    }

    // 5. High Clicks, Low Conversions
    const platformAvgConvRate = scorecards.reduce((s, b) => s + b.conversionRate, 0) / Math.max(scorecards.length, 1);
    if (sc.ctr >= 1.5 && sc.conversionRate < platformAvgConvRate * 0.5 && sc.clicks >= 20) {
      insights.push({
        id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
        severity: "warning", category: "Conversion Gap",
        title: `High clicks, low conversions — ${name}`,
        description: `CTR of ${sc.ctr.toFixed(2)}% is healthy but conversion rate is only ${sc.conversionRate.toFixed(2)}% (platform avg: ${platformAvgConvRate.toFixed(2)}%). Review landing page quality and offer relevance.`,
        actionLabel: "View Analytics", actionHref: "/admin/marketplace/campaigns",
      });
    }
  }

  // 6. Budget Near Exhaustion (per campaign)
  for (const c of campaigns) {
    if (c.total_budget_cents && c.total_budget_cents > 0 && c.status === "active") {
      const pct = (c.total_spent_cents / c.total_budget_cents) * 100;
      if (pct >= 85) {
        const brokerName = scorecards.find(s => s.broker_slug === c.broker_slug)?.company_name || c.broker_slug;
        insights.push({
          id: `i-${idx++}`, broker_slug: c.broker_slug, company_name: brokerName,
          severity: "critical", category: "Budget Exhaustion",
          title: `Budget nearly exhausted — ${c.name}`,
          description: `Campaign "${c.name}" has spent ${pct.toFixed(0)}% of its $${(c.total_budget_cents / 100).toFixed(0)} total budget. Notify ${brokerName} to top up or adjust.`,
          actionLabel: "View Campaign", actionHref: "/admin/marketplace/campaigns",
        });
      }
    }
  }

  // 7. Underspending (per campaign)
  for (const c of campaigns) {
    if (c.daily_budget_cents && c.daily_budget_cents > 0 && c.status === "active") {
      const stats = dailyStatsByCampaign.get(c.id);
      if (stats && stats.impressions > 0) {
        // Get avg daily spend for this campaign
        const brokerDailyData = dailyStatsByBroker.get(c.broker_slug);
        const daysActive = brokerDailyData ? brokerDailyData.size : 1;
        const avgDailySpend = stats.spend_cents / Math.max(daysActive, 1);
        if (avgDailySpend < c.daily_budget_cents * 0.3 && avgDailySpend > 0) {
          const brokerName = scorecards.find(s => s.broker_slug === c.broker_slug)?.company_name || c.broker_slug;
          insights.push({
            id: `i-${idx++}`, broker_slug: c.broker_slug, company_name: brokerName,
            severity: "info", category: "Underspending",
            title: `Underspending — ${c.name}`,
            description: `Campaign uses only ${((avgDailySpend / c.daily_budget_cents) * 100).toFixed(0)}% of its $${(c.daily_budget_cents / 100).toFixed(0)}/day budget. Consider lowering budget or broadening targeting.`,
            actionLabel: "View Campaign", actionHref: "/admin/marketplace/campaigns",
          });
        }
      }
    }
  }

  // 8. Placement Opportunity
  for (const sc of scorecards) {
    const brokerCampaigns = campaigns.filter(c => c.broker_slug === sc.broker_slug && c.status === "active");
    if (brokerCampaigns.length < 2) continue;
    const placementPerf: Map<number, { clicks: number; impressions: number }> = new Map();
    for (const c of brokerCampaigns) {
      const stats = dailyStatsByCampaign.get(c.id);
      if (!stats) continue;
      const existing = placementPerf.get(c.placement_id) || { clicks: 0, impressions: 0 };
      existing.clicks += stats.clicks;
      existing.impressions += stats.impressions;
      placementPerf.set(c.placement_id, existing);
    }
    const placements = Array.from(placementPerf.entries()).map(([pid, s]) => ({
      pid, ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0, impressions: s.impressions,
    })).filter(p => p.impressions >= 50);
    if (placements.length >= 2) {
      placements.sort((a, b) => b.ctr - a.ctr);
      const best = placements[0];
      const worst = placements[placements.length - 1];
      if (worst.ctr > 0 && best.ctr >= worst.ctr * 2) {
        const name = sc.company_name || sc.broker_slug;
        insights.push({
          id: `i-${idx++}`, broker_slug: sc.broker_slug, company_name: name,
          severity: "info", category: "Placement Opportunity",
          title: `Placement opportunity — ${name}`,
          description: `"${placementMap.get(best.pid) || "Placement"}" delivers ${best.ctr.toFixed(1)}% CTR vs ${worst.ctr.toFixed(1)}% on "${placementMap.get(worst.pid) || "Placement"}". Suggest shifting budget to the higher-performing placement.`,
          actionLabel: "View Campaigns", actionHref: "/admin/marketplace/campaigns",
        });
      }
    }
  }

  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return insights;
}

/* ─────────────────────── Main Page ─────────────────────── */

export default function AdvertiserIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("portfolio");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  // Data
  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null);
  const [scorecards, setScorecards] = useState<BrokerScorecard[]>([]);
  const [insights, setInsights] = useState<ConsultingInsight[]>([]);
  const [dailyRevenueTrend, setDailyRevenueTrend] = useState<{ label: string; value: number }[]>([]);
  const [revenueByBroker, setRevenueByBroker] = useState<{ label: string; value: number }[]>([]);
  const [revenueByPlacement, setRevenueByPlacement] = useState<{ label: string; value: number; color: string }[]>([]);
  const [heatmapData, setHeatmapData] = useState<Map<string, Map<number, { ctr: number; spend: number }>>>(new Map());
  const [placements, setPlacements] = useState<{ id: number; slug: string; name: string }[]>([]);
  const [revenueSparkline, setRevenueSparkline] = useState<number[]>([]);

  // UI state
  const [sortField, setSortField] = useState("healthScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedBroker, setExpandedBroker] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [heatmapMetric, setHeatmapMetric] = useState<"ctr" | "spend">("ctr");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifBroker, setNotifBroker] = useState<string | null>(null);

  const daysNum = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
  const dateFrom = new Date(Date.now() - daysNum * 86400000).toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [
      { data: brokerAccounts },
      { data: wallets },
      { data: allCampaigns },
      { data: dailyStats },
      { data: allPlacements },
      { data: allCreatives },
      { data: spendTxns },
      { data: activityLogs },
    ] = await Promise.all([
      supabase.from("broker_accounts").select("broker_slug, company_name, email, status, last_login_at, package_id"),
      supabase.from("broker_wallets").select("broker_slug, balance_cents, lifetime_deposited_cents, lifetime_spent_cents"),
      supabase.from("campaigns").select("id, broker_slug, placement_id, name, status, rate_cents, daily_budget_cents, total_budget_cents, total_spent_cents, inventory_type, start_date, end_date, created_at"),
      supabase.from("campaign_daily_stats").select("campaign_id, broker_slug, stat_date, impressions, clicks, conversions, spend_cents").gte("stat_date", dateFrom),
      supabase.from("marketplace_placements").select("id, slug, name, inventory_type, max_slots, monthly_impressions, avg_ctr_pct"),
      supabase.from("broker_creatives").select("broker_slug, type, is_active, created_at, updated_at"),
      supabase.from("wallet_transactions").select("broker_slug, type, amount_cents, created_at").eq("type", "spend").gte("created_at", dateFrom).order("created_at", { ascending: true }),
      supabase.from("broker_activity_log").select("broker_slug, action, created_at").order("created_at", { ascending: false }),
    ]);

    const accounts = brokerAccounts || [];
    const walletsArr = wallets || [];
    const campaignsArr = (allCampaigns || []) as { id: number; broker_slug: string; placement_id: number; name: string; status: string; rate_cents: number; daily_budget_cents: number | null; total_budget_cents: number | null; total_spent_cents: number; inventory_type: string; start_date: string; end_date: string | null; created_at: string }[];
    const statsArr = dailyStats || [];
    const placementsArr = allPlacements || [];
    const creativesArr = (allCreatives || []) as { broker_slug: string; type: string; is_active: boolean; created_at: string; updated_at: string }[];
    const txnsArr = spendTxns || [];
    const logsArr = activityLogs || [];

    // Build lookup maps
    const walletMap = new Map(walletsArr.map((w: { broker_slug: string; balance_cents: number; lifetime_deposited_cents: number; lifetime_spent_cents: number }) => [w.broker_slug, w]));
    const placementMap = new Map(placementsArr.map((p: { id: number; slug: string; name: string }) => [p.id, p.name]));
    const placementList = placementsArr.map((p: { id: number; slug: string; name: string }) => ({ id: p.id, slug: p.slug, name: p.name }));
    setPlacements(placementList);

    // Last activity per broker
    const lastActivityMap = new Map<string, string>();
    for (const log of logsArr) {
      if (!lastActivityMap.has(log.broker_slug)) {
        lastActivityMap.set(log.broker_slug, log.created_at);
      }
    }

    // Aggregate daily stats by broker
    const dailyStatsByBroker = new Map<string, Map<string, { impressions: number; clicks: number; conversions: number; spend_cents: number }>>();
    const dailyStatsByCampaign = new Map<number, { impressions: number; clicks: number; spend_cents: number }>();
    const campaignPlacementMap = new Map<number, number>();

    for (const c of campaignsArr) {
      campaignPlacementMap.set(c.id, c.placement_id);
    }

    for (const s of statsArr) {
      // By broker + date
      if (!dailyStatsByBroker.has(s.broker_slug)) dailyStatsByBroker.set(s.broker_slug, new Map());
      const brokerMap = dailyStatsByBroker.get(s.broker_slug)!;
      const existing = brokerMap.get(s.stat_date) || { impressions: 0, clicks: 0, conversions: 0, spend_cents: 0 };
      existing.impressions += s.impressions;
      existing.clicks += s.clicks;
      existing.conversions += s.conversions;
      existing.spend_cents += s.spend_cents;
      brokerMap.set(s.stat_date, existing);

      // By campaign (aggregate)
      const ce = dailyStatsByCampaign.get(s.campaign_id) || { impressions: 0, clicks: 0, spend_cents: 0 };
      ce.impressions += s.impressions;
      ce.clicks += s.clicks;
      ce.spend_cents += s.spend_cents;
      dailyStatsByCampaign.set(s.campaign_id, ce);
    }

    // Platform-wide averages
    let totalImp = 0, totalClk = 0, totalConv = 0, totalSpend = 0;
    for (const s of statsArr) {
      totalImp += s.impressions;
      totalClk += s.clicks;
      totalConv += s.conversions;
      totalSpend += s.spend_cents;
    }
    const platformCTR = totalImp > 0 ? (totalClk / totalImp) * 100 : 0;
    const platformConvRate = totalClk > 0 ? (totalConv / totalClk) * 100 : 0;

    // Build scorecards
    const cards: BrokerScorecard[] = accounts.map((a: { broker_slug: string; company_name: string; email: string; status: string; last_login_at: string | null; package_id: number | null }) => {
      const brokerDaily = dailyStatsByBroker.get(a.broker_slug);
      let imp = 0, clk = 0, conv = 0, spend = 0;
      const dailySpends: number[] = [];
      if (brokerDaily) {
        const dates = Array.from(brokerDaily.keys()).sort();
        for (const d of dates) {
          const v = brokerDaily.get(d)!;
          imp += v.impressions;
          clk += v.clicks;
          conv += v.conversions;
          spend += v.spend_cents;
          dailySpends.push(v.spend_cents);
        }
      }
      const ctr = imp > 0 ? (clk / imp) * 100 : 0;
      const convRate = clk > 0 ? (conv / clk) * 100 : 0;
      const avgCpc = clk > 0 ? spend / clk / 100 : 0;
      const wallet = walletMap.get(a.broker_slug) as { balance_cents: number } | undefined;
      const activeCampaigns = campaignsArr.filter(c => c.broker_slug === a.broker_slug && c.status === "active").length;
      const totalCampaigns = campaignsArr.filter(c => c.broker_slug === a.broker_slug).length;

      const { grade, score } = calculateHealthGrade({
        ctr, conversionRate: convRate,
        walletBalanceCents: wallet?.balance_cents || 0,
        activeCampaigns,
        lastLoginAt: a.last_login_at,
        lastActivityAt: lastActivityMap.get(a.broker_slug) || null,
        dailySpendTrend: dailySpends.slice(-7),
        platformAvgCTR: platformCTR,
        platformAvgConvRate: platformConvRate,
      });

      return {
        broker_slug: a.broker_slug,
        company_name: a.company_name || a.broker_slug,
        status: a.status,
        activeCampaigns,
        totalCampaigns,
        totalSpendCents: spend,
        impressions: imp,
        clicks: clk,
        conversions: conv,
        ctr, conversionRate: convRate, avgCpc,
        walletBalanceCents: wallet?.balance_cents || 0,
        healthGrade: grade,
        healthScore: score,
        trendData: dailySpends.length > 0 ? dailySpends.slice(-7) : [0],
        lastLoginAt: a.last_login_at,
        lastActivityAt: lastActivityMap.get(a.broker_slug) || null,
      };
    });

    setScorecards(cards);

    // KPIs
    const activeBrokers = cards.filter(c => c.activeCampaigns > 0).length;
    setKpis({
      activeCampaigns: campaignsArr.filter(c => c.status === "active").length,
      totalSpendCents: totalSpend,
      platformCTR,
      totalImpressions: totalImp,
      totalClicks: totalClk,
      avgCPC: totalClk > 0 ? totalSpend / totalClk / 100 : 0,
      activeBrokers,
      totalConversions: totalConv,
    });

    // Generate insights
    const allInsights = generateInsights(
      cards, campaignsArr, dailyStatsByBroker, creativesArr,
      placementMap, dailyStatsByCampaign, campaignPlacementMap,
    );
    setInsights(allInsights);

    // Daily revenue trend
    const revenueByDate = new Map<string, number>();
    for (const s of statsArr) {
      revenueByDate.set(s.stat_date, (revenueByDate.get(s.stat_date) || 0) + s.spend_cents);
    }
    const trendDates = Array.from(revenueByDate.keys()).sort();
    setDailyRevenueTrend(trendDates.map(d => ({ label: d.slice(5), value: revenueByDate.get(d)! / 100 })));
    setRevenueSparkline(trendDates.slice(-7).map(d => revenueByDate.get(d)! / 100));

    // Revenue by broker
    const revByBroker = cards
      .filter(c => c.totalSpendCents > 0)
      .sort((a, b) => b.totalSpendCents - a.totalSpendCents)
      .slice(0, 10)
      .map(c => ({ label: c.company_name, value: c.totalSpendCents / 100 }));
    setRevenueByBroker(revByBroker);

    // Revenue by placement
    const revByPlacement = new Map<number, number>();
    for (const s of statsArr) {
      const pid = campaignPlacementMap.get(s.campaign_id);
      if (pid !== undefined) {
        revByPlacement.set(pid, (revByPlacement.get(pid) || 0) + s.spend_cents);
      }
    }
    setRevenueByPlacement(
      Array.from(revByPlacement.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([pid, v], i) => ({
          label: placementMap.get(pid) || `Placement #${pid}`,
          value: v / 100,
          color: PLACEMENT_COLORS[i % PLACEMENT_COLORS.length],
        }))
    );

    // Heatmap: broker × placement
    const hm = new Map<string, Map<number, { ctr: number; spend: number }>>();
    for (const sc of cards) {
      const brokerCampaigns = campaignsArr.filter(c => c.broker_slug === sc.broker_slug);
      const placementData = new Map<number, { impressions: number; clicks: number; spend: number }>();
      for (const c of brokerCampaigns) {
        const cs = dailyStatsByCampaign.get(c.id);
        if (!cs) continue;
        const existing = placementData.get(c.placement_id) || { impressions: 0, clicks: 0, spend: 0 };
        existing.impressions += cs.impressions;
        existing.clicks += cs.clicks;
        existing.spend += cs.spend_cents;
        placementData.set(c.placement_id, existing);
      }
      const row = new Map<number, { ctr: number; spend: number }>();
      for (const [pid, d] of placementData) {
        row.set(pid, {
          ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
          spend: d.spend / 100,
        });
      }
      if (row.size > 0) hm.set(sc.broker_slug, row);
    }
    setHeatmapData(hm);

    setLoading(false);
  }, [dateFrom]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const sortedScorecards = [...scorecards].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortField];
    const bv = (b as Record<string, unknown>)[sortField];
    if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
    return 0;
  });

  const filteredInsights = severityFilter === "all" ? insights : insights.filter(i => i.severity === severityFilter);

  // Quick action: send notification
  const handleSendNotification = async (slug: string) => {
    if (!notifMessage.trim()) return;
    const supabase = createClient();
    await supabase.from("broker_notifications").insert({
      broker_slug: slug,
      type: "recommendation",
      title: "Admin Recommendation",
      message: notifMessage.trim(),
      link: "/broker-portal/campaigns",
      is_read: false,
      email_sent: false,
    });
    setNotifMessage("");
    setNotifBroker(null);
  };

  // Heatmap max for color scaling
  const heatmapMax = { ctr: 0, spend: 0 };
  for (const [, row] of heatmapData) {
    for (const [, cell] of row) {
      if (cell.ctr > heatmapMax.ctr) heatmapMax.ctr = cell.ctr;
      if (cell.spend > heatmapMax.spend) heatmapMax.spend = cell.spend;
    }
  }

  const sortIndicator = (f: string) => sortField === f ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Advertiser Intelligence</h1>
            <p className="text-sm text-slate-500">
              Bird&apos;s-eye view of all broker campaigns — health scores, consulting insights, and revenue analytics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Range:</span>
            {(["7d", "30d", "90d"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                  dateRange === r ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab.value ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {tab.value === "insights" && insights.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full">
                  {insights.filter(i => i.severity === "critical").length || insights.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ─── Tab 1: Portfolio Overview ─── */}
            {activeTab === "portfolio" && kpis && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Active Campaigns", value: kpis.activeCampaigns, color: "text-slate-900" },
                    { label: "Total Spend", value: kpis.totalSpendCents / 100, color: "text-emerald-700", prefix: "$", decimals: 0 },
                    { label: "Platform CTR", value: kpis.platformCTR, color: "text-blue-700", suffix: "%", decimals: 2 },
                    { label: "Total Impressions", value: kpis.totalImpressions, color: "text-slate-900" },
                    { label: "Total Clicks", value: kpis.totalClicks, color: "text-amber-700" },
                    { label: "Avg CPC", value: kpis.avgCPC, color: "text-purple-700", prefix: "$", decimals: 2 },
                    { label: "Active Brokers", value: kpis.activeBrokers, color: "text-slate-900" },
                    { label: "Conversions", value: kpis.totalConversions, color: "text-emerald-700" },
                  ].map((k) => (
                    <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{k.label}</p>
                        {k.label === "Total Spend" && revenueSparkline.length > 1 && (
                          <Sparkline data={revenueSparkline} color="#16a34a" width={60} height={18} />
                        )}
                      </div>
                      <p className={`text-xl font-extrabold ${k.color}`}>
                        <CountUp end={k.value} prefix={k.prefix || ""} suffix={k.suffix || ""} decimals={k.decimals || 0} duration={1000} />
                      </p>
                    </div>
                  ))}
                </div>

                {/* Revenue trend chart */}
                {dailyRevenueTrend.length > 1 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-slate-900">Daily Revenue</h3>
                        <p className="text-xs text-slate-500">Platform-wide spend over the selected period</p>
                      </div>
                      <p className="text-lg font-extrabold text-emerald-700">
                        ${(kpis.totalSpendCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs text-slate-400 font-normal ml-1">total</span>
                      </p>
                    </div>
                    <SVGLineChart
                      data={dailyRevenueTrend}
                      color="#16a34a"
                      showArea
                      showDots={dailyRevenueTrend.length <= 31}
                      width={800}
                      height={220}
                      formatValue={(v) => `$${v.toFixed(0)}`}
                    />
                  </div>
                )}

                {/* ARPU */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                        ARPU <InfoTip text="Average Revenue Per User — total spend divided by active brokers in this period." />
                      </p>
                      <p className="text-2xl font-extrabold text-purple-700 mt-1">
                        $<CountUp end={kpis.activeBrokers > 0 ? kpis.totalSpendCents / 100 / kpis.activeBrokers : 0} decimals={2} duration={1000} />
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-slate-400">
                      ${(kpis.totalSpendCents / 100).toFixed(0)} ÷ {kpis.activeBrokers} broker{kpis.activeBrokers !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Broker Scorecard ─── */}
            {activeTab === "scorecard" && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      {[
                        { field: "company_name", label: "Broker", align: "text-left" },
                        { field: "status", label: "Status", align: "text-left" },
                        { field: "activeCampaigns", label: "Active", align: "text-right" },
                        { field: "totalSpendCents", label: "Spend", align: "text-right" },
                        { field: "ctr", label: "CTR", align: "text-right" },
                        { field: "conversionRate", label: "Conv %", align: "text-right" },
                        { field: "walletBalanceCents", label: "Wallet", align: "text-right" },
                        { field: "healthScore", label: "Health", align: "text-center" },
                        { field: "", label: "Trend", align: "text-center" },
                      ].map((col) => (
                        <th
                          key={col.label}
                          onClick={() => col.field && handleSort(col.field)}
                          className={`px-4 py-3 ${col.align} ${col.field ? "cursor-pointer hover:text-slate-700" : ""} whitespace-nowrap`}
                        >
                          {col.label}{col.field ? sortIndicator(col.field) : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedScorecards.map((sc) => (
                      <Fragment key={sc.broker_slug}>
                        <tr
                          onClick={() => setExpandedBroker(expandedBroker === sc.broker_slug ? null : sc.broker_slug)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{sc.company_name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[sc.status] || "bg-slate-100 text-slate-500"}`}>
                              {sc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{sc.activeCampaigns}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            ${(sc.totalSpendCents / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">{sc.ctr.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-right">{sc.conversionRate.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            ${(sc.walletBalanceCents / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GRADE_COLORS[sc.healthGrade]}`}>
                              {sc.healthGrade}
                            </span>
                            <span className="text-[0.55rem] text-slate-400 ml-1">{sc.healthScore}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Sparkline
                              data={sc.trendData}
                              color={sc.healthGrade === "A" ? "#16a34a" : sc.healthGrade === "F" ? "#dc2626" : "#3b82f6"}
                              width={60}
                              height={18}
                            />
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expandedBroker === sc.broker_slug && (
                          <tr>
                            <td colSpan={9} className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                              <div className="space-y-3">
                                {/* Per-broker insights */}
                                {(() => {
                                  const brokerInsights = insights.filter(i => i.broker_slug === sc.broker_slug);
                                  return brokerInsights.length > 0 ? (
                                    <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Insights for {sc.company_name}</p>
                                      <div className="space-y-2">
                                        {brokerInsights.map(ins => (
                                          <div key={ins.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                                            ins.severity === "critical" ? "bg-red-50 border border-red-200" :
                                            ins.severity === "warning" ? "bg-amber-50 border border-amber-200" :
                                            "bg-blue-50 border border-blue-200"
                                          }`}>
                                            <span>{ins.severity === "critical" ? "🔴" : ins.severity === "warning" ? "🟡" : "🔵"}</span>
                                            <div className="flex-1 min-w-0">
                                              <span className="font-medium text-slate-900">{ins.category}:</span>{" "}
                                              <span className="text-slate-600">{ins.description}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-400">No active insights — performing well.</p>
                                  );
                                })()}

                                {/* Quick actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 flex-wrap">
                                  {notifBroker === sc.broker_slug ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        placeholder="Type notification message..."
                                        value={notifMessage}
                                        onChange={(e) => setNotifMessage(e.target.value)}
                                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSendNotification(sc.broker_slug); }}
                                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600"
                                      >
                                        Send
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setNotifBroker(null); setNotifMessage(""); }}
                                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setNotifBroker(sc.broker_slug); }}
                                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                                    >
                                      Send Notification
                                    </button>
                                  )}
                                  <Link
                                    href="/admin/marketplace/campaigns"
                                    className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View Campaigns
                                  </Link>
                                  <Link
                                    href="/admin/marketplace/brokers"
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Manage Account
                                  </Link>
                                </div>

                                {/* Metrics summary */}
                                <div className="grid grid-cols-4 gap-3 pt-2">
                                  {[
                                    { label: "Impressions", value: sc.impressions.toLocaleString() },
                                    { label: "Clicks", value: sc.clicks.toLocaleString() },
                                    { label: "Conversions", value: sc.conversions.toLocaleString() },
                                    { label: "Avg CPC", value: `$${sc.avgCpc.toFixed(2)}` },
                                  ].map(m => (
                                    <div key={m.label} className="bg-white rounded-lg border border-slate-200 p-2.5">
                                      <p className="text-[0.6rem] text-slate-400 font-medium">{m.label}</p>
                                      <p className="text-sm font-extrabold text-slate-900">{m.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {scorecards.length === 0 && (
                  <div className="p-12 text-center text-sm text-slate-400">No broker accounts found.</div>
                )}
              </div>
            )}

            {/* ─── Tab 3: Consulting Insights ─── */}
            {activeTab === "insights" && (
              <div className="space-y-4">
                {/* Severity filter */}
                <div className="flex gap-2">
                  {(["all", "critical", "warning", "info"] as const).map((s) => {
                    const count = s === "all" ? insights.length : insights.filter(i => i.severity === s).length;
                    return (
                      <button
                        key={s}
                        onClick={() => setSeverityFilter(s)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          severityFilter === s ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Insights list */}
                {filteredInsights.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm text-slate-500 font-medium">No actionable insights for this period.</p>
                    <p className="text-xs text-slate-400 mt-1">All brokers are performing within normal parameters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInsights.map((ins) => (
                      <div
                        key={ins.id}
                        className={`bg-white rounded-xl border p-5 ${
                          ins.severity === "critical" ? "border-red-200 bg-red-50/30" :
                          ins.severity === "warning" ? "border-amber-200 bg-amber-50/30" :
                          "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 mt-0.5 text-lg">
                            {ins.severity === "critical" ? "🔴" : ins.severity === "warning" ? "🟡" : "🔵"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900">{ins.title}</h3>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                ins.severity === "critical" ? "bg-red-100 text-red-700" :
                                ins.severity === "warning" ? "bg-amber-100 text-amber-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {ins.category}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{ins.description}</p>
                          </div>
                          <Link
                            href={ins.actionHref}
                            className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap"
                          >
                            {ins.actionLabel} →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab 4: Revenue Analytics ─── */}
            {activeTab === "revenue" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue by Broker */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-900 mb-1">Revenue by Broker</h3>
                    <p className="text-xs text-slate-500 mb-4">Top 10 advertisers by spend</p>
                    {revenueByBroker.length > 0 ? (
                      <SVGBarChart
                        data={revenueByBroker}
                        formatValue={(v) => `$${v.toFixed(0)}`}
                        color="#16a34a"
                        width={460}
                      />
                    ) : (
                      <p className="text-sm text-slate-400 py-8 text-center">No spend data in this period.</p>
                    )}
                  </div>

                  {/* Revenue by Placement */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-900 mb-1">Revenue by Placement</h3>
                    <p className="text-xs text-slate-500 mb-4">How revenue distributes across placements</p>
                    {revenueByPlacement.length > 0 ? (
                      <SVGDonutChart
                        data={revenueByPlacement}
                        centerLabel={`$${(kpis?.totalSpendCents ? kpis.totalSpendCents / 100 : 0).toFixed(0)}`}
                        centerSubLabel="total"
                        size={180}
                      />
                    ) : (
                      <p className="text-sm text-slate-400 py-8 text-center">No placement data in this period.</p>
                    )}
                  </div>
                </div>

                {/* Revenue trend line */}
                {dailyRevenueTrend.length > 1 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-900 mb-1">Daily Revenue Trend</h3>
                    <p className="text-xs text-slate-500 mb-4">Total platform spend per day</p>
                    <SVGLineChart
                      data={dailyRevenueTrend}
                      color="#16a34a"
                      showArea
                      showDots={dailyRevenueTrend.length <= 31}
                      width={900}
                      height={250}
                      formatValue={(v) => `$${v.toFixed(0)}`}
                    />
                  </div>
                )}

                {/* ARPU */}
                {kpis && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "ARPU", value: kpis.activeBrokers > 0 ? kpis.totalSpendCents / 100 / kpis.activeBrokers : 0, prefix: "$", tip: "Average Revenue Per User — total spend ÷ active brokers" },
                      { label: "Revenue / Campaign", value: kpis.activeCampaigns > 0 ? kpis.totalSpendCents / 100 / kpis.activeCampaigns : 0, prefix: "$", tip: "Total spend ÷ active campaigns" },
                      { label: "Revenue / Click", value: kpis.totalClicks > 0 ? kpis.totalSpendCents / 100 / kpis.totalClicks : 0, prefix: "$", tip: "Platform-wide average cost per click" },
                      { label: "Revenue / 1K Imp", value: kpis.totalImpressions > 0 ? (kpis.totalSpendCents / 100) / (kpis.totalImpressions / 1000) : 0, prefix: "$", tip: "Effective CPM — revenue per 1,000 impressions" },
                    ].map(m => (
                      <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                          {m.label} <InfoTip text={m.tip} />
                        </p>
                        <p className="text-xl font-extrabold text-purple-700 mt-1">
                          <CountUp end={m.value} prefix={m.prefix} decimals={2} duration={1000} />
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab 5: Performance Heatmap ─── */}
            {activeTab === "heatmap" && (
              <div className="space-y-4">
                {/* Metric toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Metric:</span>
                  {(["ctr", "spend"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setHeatmapMetric(m)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        heatmapMetric === m ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m === "ctr" ? "CTR (%)" : "Spend ($)"}
                    </button>
                  ))}
                </div>

                {heatmapData.size > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-slate-500 font-medium sticky left-0 bg-slate-50 z-10 whitespace-nowrap">
                            Broker
                          </th>
                          {placements.map((p) => (
                            <th key={p.id} className="px-3 py-3 text-center text-slate-500 font-medium whitespace-nowrap">
                              {p.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedScorecards.filter(sc => heatmapData.has(sc.broker_slug)).map((sc) => (
                          <tr key={sc.broker_slug} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white z-10">
                              {sc.company_name}
                            </td>
                            {placements.map((p) => {
                              const row = heatmapData.get(sc.broker_slug);
                              const cell = row?.get(p.id);
                              const maxVal = heatmapMax[heatmapMetric];
                              const val = cell ? cell[heatmapMetric] : 0;
                              const intensity = maxVal > 0 ? Math.min(Math.max(val / maxVal, 0.05), 1) : 0;
                              return (
                                <td key={p.id} className="px-3 py-3 text-center">
                                  {cell ? (
                                    <div
                                      className="inline-flex items-center justify-center w-16 h-8 rounded text-xs font-semibold transition-colors"
                                      style={{
                                        backgroundColor: `rgba(22, 163, 74, ${intensity})`,
                                        color: intensity > 0.5 ? "white" : "#334155",
                                      }}
                                    >
                                      {heatmapMetric === "ctr"
                                        ? `${cell.ctr.toFixed(1)}%`
                                        : `$${cell.spend.toFixed(0)}`}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-sm text-slate-400">No campaign data to display for this period.</p>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Low</span>
                  <div className="flex">
                    {[0.1, 0.25, 0.45, 0.65, 0.85].map((v) => (
                      <div key={v} className="w-8 h-4 rounded-sm" style={{ backgroundColor: `rgba(22, 163, 74, ${v})` }} />
                    ))}
                  </div>
                  <span>High</span>
                  <span className="ml-2 text-slate-400">— = no data</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

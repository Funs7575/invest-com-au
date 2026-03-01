"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import CountUp from "@/components/CountUp";
import Sparkline from "@/components/Sparkline";

interface Stats {
  brokers: number;
  articles: number;
  scenarios: number;
  clicks: number;
  clicksToday: number;
  emails: number;
  marketplaceRevenue: number;
  activeMarketplaceCampaigns: number;
  proSubscribers: number;
}

interface RevenueByBroker {
  broker_name: string;
  broker_slug: string;
  clicks: number;
  estimated_epc: number;
  estimated_revenue: number;
}

interface HealthIssue {
  type: "success" | "warning" | "error";
  message: string;
  link?: string;
}

interface RecentClick {
  id: number;
  broker_name: string;
  source: string;
  page: string;
  clicked_at: string;
}

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  color: string;
}

interface DataWarning {
  severity: "error" | "warning" | "info";
  icon: string;
  title: string;
  items: string[];
  href: string;
  actionLabel: string;
}

interface DailyClickData {
  date: string;
  count: number;
}

const SPARKLINE_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  emerald: "#10b981",
  rose: "#f43f5e",
  indigo: "#6366f1",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthIssue[]>([]);
  const [recentClicks, setRecentClicks] = useState<RecentClick[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueByBroker[]>([]);
  const [dailyClicks, setDailyClicks] = useState<DailyClickData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dataWarnings, setDataWarnings] = useState<DataWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      // Build date range for last 14 days
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        brokers, articles, scenarios, clicks, clicksToday, emails,
        brokersData, dealCount, recent, revenueRes,
        clicksLast14d,
        marketplaceCampaigns, marketplaceSpend,
        proSubs,
      ] = await Promise.all([
        supabase.from("brokers").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("scenarios").select("id", { count: "exact", head: true }),
        supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }),
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", new Date().toISOString().split("T")[0]),
        supabase.from("email_captures").select("id", { count: "exact", head: true }),
        // Health check data
        supabase
          .from("brokers")
          .select("name, slug, affiliate_url, pros, cons, review_content")
          .eq("status", "active"),
        supabase
          .from("brokers")
          .select("id", { count: "exact", head: true })
          .eq("deal", true),
        // Recent clicks
        supabase
          .from("affiliate_clicks")
          .select("id, broker_name, source, page, clicked_at")
          .order("clicked_at", { ascending: false })
          .limit(8),
        // Revenue stats
        supabase.rpc("get_revenue_stats_by_broker"),
        // Last 14 days of clicks for sparkline + chart
        supabase
          .from("affiliate_clicks")
          .select("clicked_at")
          .gte("clicked_at", fourteenDaysAgo)
          .order("clicked_at", { ascending: true }),
        // Marketplace campaigns
        supabase
          .from("campaigns")
          .select("id, status", { count: "exact" })
          .eq("status", "active"),
        // Marketplace total spend
        supabase
          .from("campaign_events")
          .select("cost_cents")
          .eq("event_type", "click"),
        // Pro subscribers
        Promise.resolve(supabase.rpc("get_active_pro_count")).catch(() => ({ data: null, count: 0 })),
      ]);

      // Aggregate clicks by date for chart
      const clicksByDate = new Map<string, number>();
      // Pre-fill last 14 days with 0
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        clicksByDate.set(d, 0);
      }
      if (clicksLast14d.data) {
        for (const c of clicksLast14d.data) {
          const date = new Date(c.clicked_at).toISOString().split("T")[0];
          clicksByDate.set(date, (clicksByDate.get(date) || 0) + 1);
        }
      }
      const dailyData = Array.from(clicksByDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
      setDailyClicks(dailyData);

      // Calculate marketplace revenue
      const mktRevenue = (marketplaceSpend.data || []).reduce(
        (sum: number, e: { cost_cents: number }) => sum + (e.cost_cents || 0), 0
      ) / 100;

      setStats({
        brokers: brokers.count || 0,
        articles: articles.count || 0,
        scenarios: scenarios.count || 0,
        clicks: clicks.count || 0,
        clicksToday: clicksToday.count || 0,
        emails: emails.count || 0,
        marketplaceRevenue: mktRevenue,
        activeMarketplaceCampaigns: marketplaceCampaigns.count || 0,
        proSubscribers: typeof proSubs.data === "number" ? proSubs.data : 0,
      });

      // Health checks
      const issues: HealthIssue[] = [];

      if (brokersData.data) {
        const noAffiliate = brokersData.data.filter((b) => !b.affiliate_url);
        if (noAffiliate.length > 0) {
          issues.push({
            type: "error",
            message: `${noAffiliate.length} broker(s) missing affiliate URL: ${noAffiliate.map((b) => b.name).join(", ")}`,
            link: "/admin/affiliate-links",
          });
        }

        const noPros = brokersData.data.filter((b) => !b.pros || b.pros.length === 0);
        if (noPros.length > 0) {
          issues.push({
            type: "warning",
            message: `${noPros.length} broker(s) missing pros: ${noPros.map((b) => b.name).join(", ")}`,
            link: "/admin/brokers",
          });
        }

        const noCons = brokersData.data.filter((b) => !b.cons || b.cons.length === 0);
        if (noCons.length > 0) {
          issues.push({
            type: "warning",
            message: `${noCons.length} broker(s) missing cons: ${noCons.map((b) => b.name).join(", ")}`,
            link: "/admin/brokers",
          });
        }

        const noReview = brokersData.data.filter((b) => !b.review_content);
        if (noReview.length > 0) {
          issues.push({
            type: "warning",
            message: `${noReview.length} broker(s) missing review content`,
            link: "/admin/brokers",
          });
        }
      }

      if (!dealCount.count || dealCount.count === 0) {
        issues.push({
          type: "warning",
          message: "No Deal of the Month is currently set",
          link: "/admin/deal-of-month",
        });
      }

      if (issues.length === 0) {
        issues.push({ type: "success", message: "All content health checks passed!" });
      }

      setHealth(issues);
      // Data validation warnings
      const warnings: DataWarning[] = [];

      // Check brokers missing key data
      if (brokersData.data) {
        const noMetaDesc = brokersData.data.filter((b: { name: string; slug: string; affiliate_url: string; pros: string[]; cons: string[]; review_content: string }) => !b.review_content);
        if (noMetaDesc.length > 0) {
          warnings.push({
            severity: "warning",
            icon: "📋",
            title: `${noMetaDesc.length} broker(s) missing review content`,
            items: noMetaDesc.slice(0, 5).map((b: { name: string }) => b.name),
            href: "/admin/brokers",
            actionLabel: "Edit Brokers",
          });
        }
      }

      // Check articles missing meta descriptions
      const { data: articlesNoMeta } = await supabase
        .from("articles")
        .select("title")
        .eq("status", "published")
        .or("meta_description.is.null,meta_description.eq.");
      if (articlesNoMeta && articlesNoMeta.length > 0) {
        warnings.push({
          severity: "warning",
          icon: "🔍",
          title: `${articlesNoMeta.length} published article(s) missing meta description`,
          items: articlesNoMeta.slice(0, 5).map((a: { title: string }) => a.title),
          href: "/admin/articles",
          actionLabel: "Edit Articles",
        });
      }

      // Check stale articles (not updated in 90+ days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data: staleArticles, count: staleCount } = await supabase
        .from("articles")
        .select("title", { count: "exact" })
        .eq("status", "published")
        .lt("updated_at", ninetyDaysAgo)
        .limit(5);
      if (staleCount && staleCount > 0) {
        warnings.push({
          severity: "info",
          icon: "📅",
          title: `${staleCount} article(s) not updated in 90+ days`,
          items: (staleArticles || []).map((a: { title: string }) => a.title),
          href: "/admin/articles",
          actionLabel: "Review Articles",
        });
      }

      // Check draft articles pile-up
      const { count: draftCount } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft");
      if (draftCount && draftCount > 5) {
        warnings.push({
          severity: "info",
          icon: "📝",
          title: `${draftCount} draft articles pending publication`,
          items: [],
          href: "/admin/articles",
          actionLabel: "View Drafts",
        });
      }

      // Check quiz with no active questions
      const { count: activeQuizCount } = await supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("active", true);
      if (activeQuizCount !== null && activeQuizCount < 3) {
        warnings.push({
          severity: "error",
          icon: "❓",
          title: `Only ${activeQuizCount} active quiz question(s)`,
          items: ["Minimum 3 recommended for a good user experience"],
          href: "/admin/quiz-questions",
          actionLabel: "Edit Quiz",
        });
      }

      setDataWarnings(warnings);

      // Build recent activity feed from multiple sources
      const activityItems: ActivityItem[] = [];

      // Recent clicks as activity
      if (recent.data) {
        recent.data.slice(0, 3).forEach((c: RecentClick) => {
          activityItems.push({
            id: `click-${c.id}`,
            icon: "🖱️",
            title: `Click on ${c.broker_name}`,
            detail: `from ${c.source || "direct"} · ${c.page || "/"}`,
            time: c.clicked_at,
            href: "/admin/analytics",
            color: "amber",
          });
        });
      }

      // Recent reviews
      const { data: recentReviews } = await supabase
        .from("user_reviews")
        .select("id, display_name, broker_slug, rating, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      if (recentReviews) {
        recentReviews.forEach((r: { id: number; display_name: string; broker_slug: string; rating: number; status: string; created_at: string }) => {
          activityItems.push({
            id: `review-${r.id}`,
            icon: "⭐",
            title: `${r.display_name} reviewed ${r.broker_slug}`,
            detail: `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} · ${r.status}`,
            time: r.created_at,
            href: "/admin/user-reviews",
            color: "yellow",
          });
        });
      }

      // Recent articles
      const { data: recentArticles } = await supabase
        .from("articles")
        .select("id, title, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(2);
      if (recentArticles) {
        recentArticles.forEach((a: { id: number; title: string; status: string; updated_at: string }) => {
          activityItems.push({
            id: `article-${a.id}`,
            icon: "📝",
            title: `Article "${a.title}"`,
            detail: a.status === "published" ? "published" : "saved as draft",
            time: a.updated_at,
            href: "/admin/articles",
            color: "green",
          });
        });
      }

      // Recent email captures
      const { data: recentEmails } = await supabase
        .from("email_captures")
        .select("id, email, source, captured_at")
        .order("captured_at", { ascending: false })
        .limit(2);
      if (recentEmails) {
        recentEmails.forEach((e: { id: number; email: string; source: string; captured_at: string }) => {
          activityItems.push({
            id: `email-${e.id}`,
            icon: "📧",
            title: `New subscriber: ${e.email}`,
            detail: `via ${e.source || "unknown"}`,
            time: e.captured_at,
            href: "/admin/subscribers",
            color: "cyan",
          });
        });
      }

      // Sort by time descending, take top 10
      activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(activityItems.slice(0, 10));

      if (recent.data) setRecentClicks(recent.data);
      if (revenueRes.data) {
        setRevenueStats(
          revenueRes.data.map((r: RevenueByBroker) => ({
            broker_name: r.broker_name,
            broker_slug: r.broker_slug,
            clicks: Number(r.clicks),
            estimated_epc: Number(r.estimated_epc),
            estimated_revenue: Number(r.estimated_revenue),
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  // Build sparkline data from last 7 days of daily clicks
  const last7Sparkline = dailyClicks.slice(-7).map((d) => d.count);
  const prev7Sparkline = dailyClicks.slice(0, 7).map((d) => d.count);
  const last7Total = last7Sparkline.reduce((s, v) => s + v, 0);
  const prev7Total = prev7Sparkline.reduce((s, v) => s + v, 0);
  const clickTrend = prev7Total > 0 ? Math.round(((last7Total - prev7Total) / prev7Total) * 100) : 0;

  // Chart dimensions
  const chartHeight = 120;
  const chartWidth = 100; // percentage-based via SVG viewBox

  const cards = [
    { label: "Brokers", value: stats?.brokers || 0, href: "/admin/brokers", color: "blue", icon: "🏦" },
    { label: "Articles", value: stats?.articles || 0, href: "/admin/articles", color: "green", icon: "📝" },
    { label: "Total Clicks", value: stats?.clicks || 0, href: "/admin/analytics", color: "amber", icon: "🖱️", sparkline: last7Sparkline, trend: clickTrend },
    { label: "Clicks Today", value: stats?.clicksToday || 0, href: "/admin/analytics", color: "red", icon: "📊" },
    { label: "Email Captures", value: stats?.emails || 0, href: "/admin/subscribers", color: "cyan", icon: "📧" },
    { label: "Pro Members", value: stats?.proSubscribers || 0, href: "/admin/pro-subscribers", color: "purple", icon: "💎" },
    { label: "Marketplace Rev", value: stats?.marketplaceRevenue || 0, href: "/admin/marketplace", color: "emerald", icon: "💰", prefix: "$", decimals: 2 },
    { label: "Active Campaigns", value: stats?.activeMarketplaceCampaigns || 0, href: "/admin/marketplace/campaigns", color: "indigo", icon: "📣" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
  };

  // Chart bar max
  const chartMax = Math.max(...dailyClicks.map((d) => d.count), 1);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your site&apos;s performance, content health, and revenue.</p>
      </div>

      {/* Getting Started — shown when site has minimal content */}
      {!loading && stats && (stats.brokers < 3 || stats.articles < 3) && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-bold text-amber-900 mb-2">👋 Getting Started</h2>
          <p className="text-xs text-amber-800 mb-3">Welcome to your admin panel. Here are the first things to set up:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/admin/brokers" className="flex items-start gap-2 bg-white/80 rounded-lg p-3 hover:bg-white transition-colors">
              <span className="text-base shrink-0">🏦</span>
              <div>
                <div className="text-xs font-bold text-slate-900">1. Add Brokers</div>
                <div className="text-[0.65rem] text-slate-500 mt-0.5">Add broker listings with fees and affiliate links</div>
              </div>
            </Link>
            <Link href="/admin/articles" className="flex items-start gap-2 bg-white/80 rounded-lg p-3 hover:bg-white transition-colors">
              <span className="text-base shrink-0">📝</span>
              <div>
                <div className="text-xs font-bold text-slate-900">2. Write Articles</div>
                <div className="text-[0.65rem] text-slate-500 mt-0.5">Create comparison guides and educational content</div>
              </div>
            </Link>
            <Link href="/admin/affiliate-links" className="flex items-start gap-2 bg-white/80 rounded-lg p-3 hover:bg-white transition-colors">
              <span className="text-base shrink-0">🔗</span>
              <div>
                <div className="text-xs font-bold text-slate-900">3. Set Up Affiliate Links</div>
                <div className="text-[0.65rem] text-slate-500 mt-0.5">Add referral URLs and set EPC for revenue tracking</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Health summary banner */}
      {!loading && health.length > 0 && health[0].type !== "success" && (
        <div className={`rounded-lg px-4 py-2 mb-4 flex items-center gap-2 ${
          health.some((h) => h.type === "error")
            ? "bg-red-50 border border-red-200"
            : "bg-amber-50 border border-amber-200"
        }`}>
          <span className={health.some((h) => h.type === "error") ? "text-red-500" : "text-amber-500"}>
            {health.some((h) => h.type === "error") ? "●" : "▲"}
          </span>
          <span className={`text-sm ${health.some((h) => h.type === "error") ? "text-red-800" : "text-amber-800"}`}>
            {health.filter((h) => h.type === "error").length > 0 && (
              <>{health.filter((h) => h.type === "error").length} error{health.filter((h) => h.type === "error").length !== 1 ? "s" : ""}</>
            )}
            {health.filter((h) => h.type === "error").length > 0 && health.filter((h) => h.type === "warning").length > 0 && " and "}
            {health.filter((h) => h.type === "warning").length > 0 && (
              <>{health.filter((h) => h.type === "warning").length} warning{health.filter((h) => h.type === "warning").length !== 1 ? "s" : ""}</>
            )}
            {" "}need attention
          </span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 w-6 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-20 bg-slate-200 rounded mb-1" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
              </div>
            ))
          : cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all group ${colorMap[card.color]?.split(" ")[2] || "border-slate-200"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{card.icon}</span>
                  {card.sparkline && card.sparkline.length > 1 && (
                    <Sparkline
                      data={card.sparkline}
                      width={60}
                      height={20}
                      color={SPARKLINE_COLORS[card.color] || "#3b82f6"}
                    />
                  )}
                </div>
                <div className={`text-2xl font-bold ${colorMap[card.color]?.split(" ")[1] || "text-slate-900"}`}>
                  <CountUp
                    end={card.value}
                    prefix={card.prefix || ""}
                    decimals={card.decimals || 0}
                    duration={1200}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-500">{card.label}</span>
                  {card.trend !== undefined && card.trend !== 0 && (
                    <span className={`text-[0.65rem] font-semibold ${card.trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {card.trend > 0 ? "+" : ""}{card.trend}%
                    </span>
                  )}
                </div>
              </Link>
            ))}
      </div>

      {/* Click Trend Chart */}
      {!loading && dailyClicks.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Click Trend</h2>
              <p className="text-xs text-slate-500">Last 14 days</p>
            </div>
            <Link href="/admin/analytics" className="text-xs text-amber-600 hover:text-amber-700">
              Full Analytics →
            </Link>
          </div>
          <div className="flex items-end gap-1" style={{ height: chartHeight }}>
            {dailyClicks.map((d, i) => {
              const barH = chartMax > 0 ? (d.count / chartMax) * (chartHeight - 20) : 0;
              const isToday = d.date === new Date().toISOString().split("T")[0];
              const isLastWeek = i < 7;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                  style={{ height: chartHeight }}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[0.6rem] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {d.count} click{d.count !== 1 ? "s" : ""} · {new Date(d.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </div>
                  <div
                    className={`w-full rounded-t transition-colors ${
                      isToday
                        ? "bg-amber-500"
                        : isLastWeek
                        ? "bg-slate-200 group-hover:bg-slate-300"
                        : "bg-amber-400/70 group-hover:bg-amber-500"
                    }`}
                    style={{ height: Math.max(barH, 2), minHeight: 2 }}
                  />
                  {/* Date label — show every other day */}
                  {i % 2 === 0 && (
                    <div className="text-[0.55rem] text-slate-400 mt-1 leading-none">
                      {new Date(d.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[0.65rem] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" /> Previous 7d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/70 inline-block" /> Last 7d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Today</span>
          </div>
        </div>
      )}

      {/* Data Validation Warnings */}
      {!loading && dataWarnings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Data Quality</h2>
              <p className="text-xs text-slate-500">{dataWarnings.length} issue{dataWarnings.length !== 1 ? "s" : ""} found</p>
            </div>
            <div className="flex items-center gap-1.5">
              {dataWarnings.filter(w => w.severity === "error").length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-red-50 text-red-700">
                  {dataWarnings.filter(w => w.severity === "error").length} error{dataWarnings.filter(w => w.severity === "error").length !== 1 ? "s" : ""}
                </span>
              )}
              {dataWarnings.filter(w => w.severity === "warning").length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-amber-50 text-amber-700">
                  {dataWarnings.filter(w => w.severity === "warning").length} warning{dataWarnings.filter(w => w.severity === "warning").length !== 1 ? "s" : ""}
                </span>
              )}
              {dataWarnings.filter(w => w.severity === "info").length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-blue-50 text-blue-700">
                  {dataWarnings.filter(w => w.severity === "info").length} info
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataWarnings.map((w, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 border ${
                  w.severity === "error" ? "bg-red-50 border-red-200" :
                  w.severity === "warning" ? "bg-amber-50 border-amber-200" :
                  "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-sm">{w.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${
                      w.severity === "error" ? "text-red-800" :
                      w.severity === "warning" ? "text-amber-800" :
                      "text-blue-800"
                    }`}>{w.title}</div>
                    {w.items.length > 0 && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {w.items.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={w.href}
                  className={`text-xs font-semibold mt-2 inline-block ${
                    w.severity === "error" ? "text-red-600 hover:text-red-700" :
                    w.severity === "warning" ? "text-amber-600 hover:text-amber-700" :
                    "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  {w.actionLabel} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Feed + Revenue Forecast */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activity Feed */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm text-slate-500">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activity.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 group-hover:text-amber-700 truncate">{item.title}</div>
                      <div className="text-xs text-slate-400 truncate">{item.detail}</div>
                    </div>
                    <div className="text-[0.6rem] text-slate-400 shrink-0 mt-1 whitespace-nowrap">
                      {(() => {
                        const diff = Date.now() - new Date(item.time).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return "just now";
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h ago`;
                        const days = Math.floor(hrs / 24);
                        return `${days}d ago`;
                      })()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Revenue Forecast */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Forecast</h2>
            {revenueStats.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">📉</div>
                <p className="text-sm text-slate-500">No revenue data yet</p>
                <p className="text-xs text-slate-400 mt-1">Set EPC values in Affiliate Links to enable forecasting</p>
              </div>
            ) : (() => {
              const totalAffRev = revenueStats.reduce((s, r) => s + r.estimated_revenue, 0);
              const totalClicks = revenueStats.reduce((s, r) => s + r.clicks, 0);
              const avgEpc = totalClicks > 0 ? totalAffRev / totalClicks : 0;
              const dailyAvgClicks = (stats?.clicks || 0) > 0 ? (stats?.clicks || 0) / 30 : 0;
              const mktRev = stats?.marketplaceRevenue || 0;

              const month30 = dailyAvgClicks * 30 * avgEpc + mktRev;
              const month60 = dailyAvgClicks * 60 * avgEpc + mktRev * 2;
              const month90 = dailyAvgClicks * 90 * avgEpc + mktRev * 3;
              const annual = dailyAvgClicks * 365 * avgEpc + mktRev * 12;

              const forecasts = [
                { label: "30-Day", value: month30, color: "emerald" },
                { label: "60-Day", value: month60, color: "emerald" },
                { label: "90-Day", value: month90, color: "emerald" },
                { label: "Annual", value: annual, color: "amber" },
              ];

              const maxForecast = annual || 1;

              return (
                <div className="space-y-4">
                  {/* Key assumptions */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Avg. daily clicks</span>
                      <span className="text-slate-700 font-medium">{dailyAvgClicks.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Avg. EPC</span>
                      <span className="text-slate-700 font-medium">${avgEpc.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Marketplace MRR</span>
                      <span className="text-slate-700 font-medium">${mktRev.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Forecast bars */}
                  <div className="space-y-3">
                    {forecasts.map((f) => (
                      <div key={f.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{f.label}</span>
                          <span className={`font-bold ${f.color === "amber" ? "text-amber-600" : "text-emerald-600"}`}>
                            ${f.value >= 1000 ? `${(f.value / 1000).toFixed(1)}k` : f.value.toFixed(0)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${f.color === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.max((f.value / maxForecast) * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[0.6rem] text-slate-400 leading-relaxed">
                      Based on current click rates and EPC values. Actual revenue depends on affiliate agreement terms, conversion rates, and traffic growth.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Health Check */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Content Health</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-2">
                  <div className="h-3 w-3 bg-slate-100 rounded-full mt-1 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {health.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-md px-2.5 py-2 ${
                  issue.type === "error" ? "bg-red-50" :
                  issue.type === "success" ? "bg-emerald-50" : "bg-amber-50"
                }`}>
                  <span className={`shrink-0 mt-0.5 text-xs ${
                    issue.type === "error" ? "text-red-500" :
                    issue.type === "success" ? "text-emerald-500" : "text-amber-500"
                  }`}>
                    {issue.type === "error" ? "●" : issue.type === "success" ? "✓" : "▲"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      issue.type === "error" ? "text-red-800" :
                      issue.type === "success" ? "text-emerald-800" : "text-amber-800"
                    }`}>{issue.message}</p>
                    {issue.link && (
                      <Link href={issue.link} className={`text-xs font-medium ${
                        issue.type === "error" ? "text-red-600 hover:text-red-700" : "text-amber-600 hover:text-amber-700"
                      }`}>
                        Fix →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Clicks */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Clicks</h2>
            <Link href="/admin/analytics" className="text-xs text-amber-600 hover:text-amber-700">View All →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                    <div className="h-3 w-36 bg-slate-200 rounded" />
                  </div>
                  <div className="h-3 w-12 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : recentClicks.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🖱️</div>
              <p className="text-sm text-slate-500">No clicks recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">Clicks will appear here once your site gets traffic.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentClicks.map((click) => (
                <div key={click.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-slate-900 font-medium truncate">{click.broker_name}</div>
                    <div className="text-xs text-slate-500 truncate">{click.source} · {click.page}</div>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0 ml-2">
                    {new Date(click.clicked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue Overview */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Revenue</h2>
            <Link href="/admin/analytics" className="text-xs text-amber-600 hover:text-amber-700">Details →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-full bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Affiliate Revenue */}
              <div className="bg-emerald-50 rounded-lg p-4 mb-3">
                <div className="text-xs text-emerald-700 font-medium mb-0.5">Affiliate Revenue (Est.)</div>
                <div className="text-2xl font-bold text-emerald-600">
                  <CountUp
                    end={revenueStats.reduce((s, r) => s + r.estimated_revenue, 0)}
                    prefix="$"
                    decimals={2}
                    duration={1400}
                  />
                </div>
                {stats && stats.clicks > 0 && revenueStats.length > 0 && (() => {
                  const totalRev = revenueStats.reduce((s, r) => s + r.estimated_revenue, 0);
                  const epcAvg = totalRev / revenueStats.reduce((s, r) => s + r.clicks, 0) || 0;
                  const dailyClicksAvg = stats.clicks / 30;
                  return (
                    <div className="mt-2 pt-2 border-t border-emerald-200 space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-emerald-600">Monthly proj.</span>
                        <span className="text-emerald-700 font-semibold">
                          ${(dailyClicksAvg * 30 * epcAvg).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-emerald-600">Annual proj.</span>
                        <span className="text-emerald-700 font-semibold">
                          ${(dailyClicksAvg * 365 * epcAvg).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Marketplace Revenue */}
              <div className="bg-indigo-50 rounded-lg p-4 mb-3">
                <div className="text-xs text-indigo-700 font-medium mb-0.5">Marketplace CPC Revenue</div>
                <div className="text-2xl font-bold text-indigo-600">
                  <CountUp
                    end={stats?.marketplaceRevenue || 0}
                    prefix="$"
                    decimals={2}
                    duration={1400}
                  />
                </div>
                <div className="text-xs text-indigo-500 mt-1">
                  {stats?.activeMarketplaceCampaigns || 0} active campaign{(stats?.activeMarketplaceCampaigns || 0) !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Top brokers */}
              {revenueStats.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  <div className="text-xs text-slate-500 uppercase font-medium">Top by Affiliate Revenue</div>
                  {revenueStats.slice(0, 3).map((r) => {
                    const maxRev = revenueStats[0]?.estimated_revenue || 1;
                    return (
                      <div key={r.broker_slug} className="relative">
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-50 rounded"
                          style={{ width: `${(r.estimated_revenue / maxRev) * 100}%` }}
                        />
                        <div className="relative flex items-center justify-between text-sm py-1 px-2">
                          <span className="text-slate-700 truncate">{r.broker_name}</span>
                          <span className="text-emerald-600 font-semibold ml-2 shrink-0">
                            ${r.estimated_revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-3">No revenue data yet. Set EPC values in Affiliate Links.</p>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <Link href="/admin/affiliate-links" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                  <span>🔗</span> Affiliate Links
                </Link>
                <Link href="/admin/marketplace" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                  <span>🏪</span> Marketplace
                </Link>
                <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-slate-600 hover:bg-slate-100 transition-colors text-sm">
                  <span>🌐</span> View Live Site
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

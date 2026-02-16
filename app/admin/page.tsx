"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface Stats {
  brokers: number;
  articles: number;
  scenarios: number;
  clicks: number;
  clicksToday: number;
  emails: number;
}

interface RevenueByBroker {
  broker_name: string;
  broker_slug: string;
  clicks: number;
  estimated_epc: number;
  estimated_revenue: number;
}

interface HealthIssue {
  type: "warning" | "error";
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthIssue[]>([]);
  const [recentClicks, setRecentClicks] = useState<RecentClick[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueByBroker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      // Batch ALL queries in a single Promise.all — stats + health data + recent clicks
      const [brokers, articles, scenarios, clicks, clicksToday, emails, brokersData, dealCount, recent, revenueRes] = await Promise.all([
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
          .limit(5),
        // Revenue stats
        supabase.rpc("get_revenue_stats_by_broker"),
      ]);

      setStats({
        brokers: brokers.count || 0,
        articles: articles.count || 0,
        scenarios: scenarios.count || 0,
        clicks: clicks.count || 0,
        clicksToday: clicksToday.count || 0,
        emails: emails.count || 0,
      });

      // Health checks
      const issues: HealthIssue[] = [];

      if (brokersData.data) {
        const noAffiliate = brokersData.data.filter((b) => !b.affiliate_url);
        if (noAffiliate.length > 0) {
          issues.push({
            type: "warning",
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
        issues.push({ type: "warning", message: "All content health checks passed!" });
      }

      setHealth(issues);
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

  const cards = [
    { label: "Brokers", value: stats?.brokers, href: "/admin/brokers", color: "bg-blue-500/10 text-blue-400" },
    { label: "Articles", value: stats?.articles, href: "/admin/articles", color: "bg-green-500/10 text-green-400" },
    { label: "Scenarios", value: stats?.scenarios, href: "/admin/scenarios", color: "bg-purple-500/10 text-purple-400" },
    { label: "Total Clicks", value: stats?.clicks, href: "/admin/analytics", color: "bg-amber-500/10 text-amber-400" },
    { label: "Clicks Today", value: stats?.clicksToday, href: "/admin/analytics", color: "bg-red-500/10 text-red-400" },
    { label: "Email Captures", value: stats?.emails, href: "#", color: "bg-cyan-500/10 text-cyan-400" },
  ];

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Health summary banner */}
      {!loading && health.length > 0 && !health[0].message.includes("passed") && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
          <span className="text-amber-400">⚠</span>
          <span className="text-sm text-amber-300">
            {health.length} content issue{health.length !== 1 ? "s" : ""} need attention
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse">
                <div className="h-8 w-16 bg-slate-700 rounded mb-2" />
                <div className="h-4 w-20 bg-slate-700 rounded" />
              </div>
            ))
          : cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
              >
                <div className={`text-3xl font-bold ${card.color}`}>
                  {card.value ?? 0}
                </div>
                <div className="text-sm text-slate-400 mt-1">{card.label}</div>
              </Link>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Health Check */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Content Health</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-2">
                  <div className="h-3 w-3 bg-slate-700 rounded-full mt-1 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-full bg-slate-700 rounded" />
                    <div className="h-3 w-16 bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {health.map((issue, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`shrink-0 mt-0.5 ${issue.type === "error" ? "text-red-400" : "text-amber-400"}`}>
                    {issue.type === "error" ? "●" : "●"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300">{issue.message}</p>
                    {issue.link && (
                      <Link href={issue.link} className="text-xs text-amber-400 hover:text-amber-300">
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
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Clicks</h2>
            <Link href="/admin/analytics" className="text-xs text-amber-400 hover:text-amber-300">View All →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-4 w-28 bg-slate-700 rounded" />
                    <div className="h-3 w-36 bg-slate-700 rounded" />
                  </div>
                  <div className="h-3 w-12 bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : recentClicks.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentClicks.map((click) => (
                <div key={click.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{click.broker_name}</div>
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
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Revenue Overview</h2>
            <Link href="/admin/analytics" className="text-xs text-amber-400 hover:text-amber-300">Details →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-full bg-slate-700 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <div className="text-sm text-slate-400 mb-1">Total Est. Revenue</div>
                <div className="text-3xl font-bold text-emerald-400">
                  ${revenueStats.reduce((s, r) => s + r.estimated_revenue, 0).toFixed(2)}
                </div>
              </div>

              {revenueStats.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-slate-500 uppercase font-medium">Top Brokers by Revenue</div>
                  {revenueStats.slice(0, 3).map((r) => (
                    <div key={r.broker_slug} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 truncate">{r.broker_name}</span>
                      <span className="text-emerald-400 font-semibold ml-2 shrink-0">
                        ${r.estimated_revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-4">No revenue data yet. Set EPC values in Affiliate Links.</p>
              )}

              <div className="pt-3 border-t border-slate-700 space-y-2">
                <Link href="/admin/affiliate-links" className="block px-3 py-2 bg-slate-700/50 rounded text-slate-300 hover:bg-slate-700 transition-colors text-sm">
                  🔗 Affiliate Links & Revenue
                </Link>
                <Link href="/admin/brokers" className="block px-3 py-2 bg-slate-700/50 rounded text-slate-300 hover:bg-slate-700 transition-colors text-sm">
                  🏦 Manage Brokers
                </Link>
                <a href="/" target="_blank" rel="noopener noreferrer" className="block px-3 py-2 bg-slate-700/50 rounded text-slate-300 hover:bg-slate-700 transition-colors text-sm">
                  🌐 View Live Site
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

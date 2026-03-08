"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface Click {
  page: string;
  broker_slug: string;
  created_at: string;
}

interface PageView {
  page: string;
}

interface ContentMetrics {
  path: string;
  label: string;
  type: "review" | "article" | "best-for" | "versus" | "calculator" | "other";
  views: number;
  clicks: number;
  ctr: number;
  estRevenue: number;
}

const CPA_AVG = 60; // Blended average across all platform types
const CONV_RATE = 0.025;

type Period = "7d" | "30d" | "90d";

export default function ContentPerformancePage() {
  const [content, setContent] = useState<ContentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"clicks" | "views" | "ctr" | "estRevenue">("estRevenue");

  useEffect(() => { fetchData(); }, [period]);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [clicksRes, viewsRes] = await Promise.all([
      supabase.from("affiliate_clicks").select("page, broker_slug, created_at").gte("created_at", since).limit(5000),
      supabase.from("analytics_events").select("page").eq("event_type", "page_view").gte("created_at", since).limit(10000),
    ]);

    const clicks = (clicksRes.data || []) as Click[];
    const views = (viewsRes.data || []) as PageView[];

    // Aggregate by page
    const clickMap = new Map<string, number>();
    for (const c of clicks) {
      const page = c.page || "unknown";
      clickMap.set(page, (clickMap.get(page) || 0) + 1);
    }

    const viewMap = new Map<string, number>();
    for (const v of views) {
      const page = v.page || "unknown";
      viewMap.set(page, (viewMap.get(page) || 0) + 1);
    }

    // Merge into content metrics
    const allPages = new Set([...clickMap.keys(), ...viewMap.keys()]);
    const result: ContentMetrics[] = [];

    for (const path of allPages) {
      const pageClicks = clickMap.get(path) || 0;
      const pageViews = viewMap.get(path) || 0;
      if (pageViews === 0 && pageClicks === 0) continue;

      let type: ContentMetrics["type"] = "other";
      let label = path;
      if (path.startsWith("/broker/")) { type = "review"; label = path.replace("/broker/", "").replace(/-/g, " "); }
      else if (path.startsWith("/article/")) { type = "article"; label = path.replace("/article/", "").replace(/-/g, " "); }
      else if (path.startsWith("/best/")) { type = "best-for"; label = "Best " + path.replace("/best/", "").replace(/-/g, " "); }
      else if (path.startsWith("/versus/")) { type = "versus"; label = path.replace("/versus/", "").replace(/-vs-/g, " vs "); }
      else if (path.includes("calculator")) { type = "calculator"; label = path.replace(/\//g, "").replace(/-/g, " "); }

      const ctr = pageViews > 0 ? (pageClicks / pageViews) * 100 : 0;
      const estRev = Math.round(pageClicks * CONV_RATE * CPA_AVG);

      result.push({ path, label, type, views: pageViews, clicks: pageClicks, ctr: Math.round(ctr * 10) / 10, estRevenue: estRev });
    }

    setContent(result);
    setLoading(false);
  }

  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of content) counts.set(c.type, (counts.get(c.type) || 0) + 1);
    return [{ key: "all", label: "All", count: content.length }, ...([
      { key: "review", label: "Reviews" },
      { key: "best-for", label: "Best-for" },
      { key: "versus", label: "Versus" },
      { key: "article", label: "Articles" },
      { key: "calculator", label: "Calculators" },
      { key: "other", label: "Other" },
    ].map(t => ({ ...t, count: counts.get(t.key) || 0 })).filter(t => t.count > 0))];
  }, [content]);

  const filtered = useMemo(() => {
    const f = filterType === "all" ? content : content.filter(c => c.type === filterType);
    return [...f].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number)).slice(0, 50);
  }, [content, filterType, sortBy]);

  const totals = useMemo(() => ({
    views: content.reduce((s, c) => s + c.views, 0),
    clicks: content.reduce((s, c) => s + c.clicks, 0),
    revenue: content.reduce((s, c) => s + c.estRevenue, 0),
    pages: content.length,
  }), [content]);

  const TYPE_COLORS: Record<string, string> = {
    review: "bg-blue-100 text-blue-700",
    article: "bg-purple-100 text-purple-700",
    "best-for": "bg-emerald-100 text-emerald-700",
    versus: "bg-amber-100 text-amber-700",
    calculator: "bg-pink-100 text-pink-700",
    other: "bg-slate-100 text-slate-600",
  };

  return (
    <AdminShell title="Content Performance" subtitle="Which pages drive affiliate clicks and estimated revenue">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          <div className="flex gap-1.5 mb-5">
            {(["7d", "30d", "90d"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${period === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p}</button>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <p className="text-[0.6rem] font-bold uppercase opacity-80">Est. Revenue</p>
              <p className="text-2xl font-extrabold">${totals.revenue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Affiliate Clicks</p>
              <p className="text-2xl font-extrabold text-slate-900">{totals.clicks.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Page Views</p>
              <p className="text-2xl font-extrabold text-slate-900">{totals.views.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Avg CTR</p>
              <p className="text-2xl font-extrabold text-slate-900">{totals.views > 0 ? ((totals.clicks / totals.views) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {types.map(t => (
              <button key={t.key} onClick={() => setFilterType(filterType === t.key ? "all" : t.key)} className={`px-2.5 py-1 text-xs font-bold rounded-lg ${filterType === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500">Page</th>
                    <th className="px-3 py-3 text-xs font-bold text-slate-500">Type</th>
                    {[
                      { key: "views" as const, label: "Views" },
                      { key: "clicks" as const, label: "Clicks" },
                      { key: "ctr" as const, label: "CTR" },
                      { key: "estRevenue" as const, label: "Est. Rev" },
                    ].map(col => (
                      <th key={col.key} className="px-3 py-3 text-xs font-bold text-slate-500 text-right cursor-pointer hover:text-slate-900" onClick={() => setSortBy(col.key)}>
                        {col.label} {sortBy === col.key && "↓"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.path} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2.5 max-w-[250px]">
                        <Link href={c.path} className="text-sm font-medium text-slate-900 hover:text-blue-600 truncate block capitalize">{c.label}</Link>
                        <span className="text-[0.55rem] text-slate-400">{c.path}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[c.type] || TYPE_COLORS.other}`}>{c.type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{c.views.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{c.clicks}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-xs font-bold ${c.ctr >= 5 ? "text-emerald-600" : c.ctr >= 2 ? "text-amber-600" : "text-slate-400"}`}>{c.ctr}%</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">${c.estRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[0.55rem] text-slate-400 mt-3 text-center">
            CTR = affiliate clicks ÷ page views. Revenue uses $60 blended CPA at 2.5% conversion. Sort any column by clicking the header.
          </p>
        </>
      )}
    </AdminShell>
  );
}

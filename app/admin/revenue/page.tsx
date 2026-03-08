"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

interface Click {
  id: number;
  broker_slug: string;
  broker_name: string;
  source: string;
  page: string;
  created_at: string;
  placement_type?: string;
}

interface BrokerCPA {
  slug: string;
  name: string;
  clicks: number;
  estConversions: number;
  estRevenue: number;
}

// Conservative CPA estimates by platform type
const CPA_ESTIMATES: Record<string, number> = {
  cfd_forex: 400,    // Pepperstone, IC Markets pay $300-800
  crypto_exchange: 30, // Crypto exchanges pay $20-50
  share_broker: 50,   // Share brokers pay $30-80
  robo_advisor: 25,
  super_fund: 0,      // No affiliate yet
  savings_account: 15,
  term_deposit: 15,
  research_tool: 10,
  property: 20,
};

const CONV_RATE = 0.025; // 2.5% click-to-signup conversion

type Period = "7d" | "30d" | "90d" | "all";

export default function RevenuePage() {
  const [clicks, setClicks] = useState<Click[]>([]);
  const [brokerTypes, setBrokerTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    const [clicksRes, brokersRes] = await Promise.all([
      supabase.from("affiliate_clicks").select("id, broker_slug, broker_name, source, page, created_at, placement_type").order("created_at", { ascending: false }).limit(5000),
      supabase.from("brokers").select("slug, platform_type").eq("status", "active"),
    ]);
    setClicks(clicksRes.data || []);
    const typeMap: Record<string, string> = {};
    for (const b of brokersRes.data || []) typeMap[b.slug] = b.platform_type || "share_broker";
    setBrokerTypes(typeMap);
    setLoading(false);
  }

  const periodClicks = useMemo(() => {
    if (period === "all") return clicks;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return clicks.filter(c => new Date(c.created_at) > cutoff);
  }, [clicks, period]);

  const byBroker = useMemo((): BrokerCPA[] => {
    const map = new Map<string, { name: string; clicks: number }>();
    for (const c of periodClicks) {
      const existing = map.get(c.broker_slug) || { name: c.broker_name || c.broker_slug, clicks: 0 };
      existing.clicks++;
      map.set(c.broker_slug, existing);
    }
    return [...map.entries()]
      .map(([slug, d]) => {
        const type = brokerTypes[slug] || "share_broker";
        const cpa = CPA_ESTIMATES[type] || 30;
        const estConv = Math.round(d.clicks * CONV_RATE * 100) / 100;
        return { slug, name: d.name, clicks: d.clicks, estConversions: estConv, estRevenue: Math.round(estConv * cpa) };
      })
      .sort((a, b) => b.estRevenue - a.estRevenue);
  }, [periodClicks, brokerTypes]);

  const byPage = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of periodClicks) {
      map.set(c.page || "unknown", (map.get(c.page || "unknown") || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [periodClicks]);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of periodClicks) {
      map.set(c.source || "direct", (map.get(c.source || "direct") || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [periodClicks]);

  const dailyClicks = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of periodClicks) {
      const day = new Date(c.created_at).toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  }, [periodClicks]);

  const totalRevenue = byBroker.reduce((s, b) => s + b.estRevenue, 0);
  const totalClicks = periodClicks.length;
  const totalConversions = byBroker.reduce((s, b) => s + b.estConversions, 0);
  const daysInPeriod = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : Math.max(1, Math.ceil((Date.now() - new Date(clicks[clicks.length - 1]?.created_at || Date.now()).getTime()) / 86400000));

  return (
    <AdminShell title="Revenue Dashboard" subtitle="Estimated affiliate earnings based on click data and industry CPA rates">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Period toggle */}
          <div className="flex gap-1.5 mb-5">
            {(["7d", "30d", "90d", "all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {p === "all" ? "All time" : p}
              </button>
            ))}
          </div>

          {/* Top-line metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white col-span-2 md:col-span-1">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider opacity-80">Est. Revenue</p>
              <p className="text-2xl font-extrabold">${totalRevenue.toLocaleString()}</p>
              <p className="text-[0.55rem] opacity-70">${Math.round(totalRevenue / daysInPeriod)}/day</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Affiliate Clicks</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalClicks.toLocaleString()}</p>
              <p className="text-[0.55rem] text-slate-400">{Math.round(totalClicks / daysInPeriod)}/day</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Est. Conversions</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalConversions.toFixed(1)}</p>
              <p className="text-[0.55rem] text-slate-400">{(CONV_RATE * 100).toFixed(1)}% conv rate</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Avg Revenue/Click</p>
              <p className="text-2xl font-extrabold text-slate-900">${totalClicks > 0 ? (totalRevenue / totalClicks).toFixed(2) : "0"}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Active Brokers</p>
              <p className="text-2xl font-extrabold text-slate-900">{byBroker.length}</p>
              <p className="text-[0.55rem] text-slate-400">with clicks</p>
            </div>
          </div>

          {/* Daily trend */}
          {dailyClicks.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Clicks</h3>
              <div className="flex items-end gap-0.5 h-20">
                {dailyClicks.map(([day, count]) => {
                  const max = Math.max(...dailyClicks.map(d => d[1] as number));
                  const pct = max > 0 ? ((count as number) / max) * 100 : 0;
                  return (
                    <div key={day} className="flex-1 group relative">
                      <div className="bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-600" style={{ height: `${Math.max(2, pct)}%` }} />
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[0.5rem] rounded whitespace-nowrap z-10">
                        {day}: {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {/* Revenue by broker */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Revenue by Broker</h3>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {byBroker.slice(0, 20).map((b, i) => (
                  <div key={b.slug} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{b.name}</p>
                      <p className="text-[0.6rem] text-slate-400">{b.clicks} clicks · {b.estConversions.toFixed(1)} est. conv</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">${b.estRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {byBroker.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No affiliate clicks in this period</p>}
              </div>
            </div>

            {/* By source + by page */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">By Source</h3>
                <div className="space-y-1.5">
                  {bySource.map(([src, count]) => (
                    <div key={src} className="flex items-center justify-between">
                      <span className="text-xs text-slate-700 truncate">{src}</span>
                      <span className="text-xs font-bold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Top Pages</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {byPage.map(([page, count]) => (
                    <div key={page} className="flex items-center justify-between">
                      <span className="text-[0.6rem] text-slate-600 truncate flex-1 mr-2">{page}</span>
                      <span className="text-xs font-bold text-slate-900 shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[0.55rem] text-slate-400 mt-4 text-center">
            Revenue estimates use industry CPA rates: CFD $400, Shares $50, Crypto $30, Savings $15 at 2.5% click-to-signup conversion. Actual revenue depends on your affiliate agreements.
          </p>
        </>
      )}
    </AdminShell>
  );
}

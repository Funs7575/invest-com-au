"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

type Period = "7d" | "30d" | "90d";

interface FunnelData {
  pageViews: number;
  emailCaptures: number;
  quizCompletions: number;
  affiliateClicks: number;
  advisorLeads: number;
  proSignups: number;
}

interface EmailSource {
  source: string;
  count: number;
}

interface RecentCapture {
  email: string;
  source: string;
  created_at: string;
  utm_source?: string;
}

export default function FunnelPage() {
  const [funnel, setFunnel] = useState<FunnelData>({ pageViews: 0, emailCaptures: 0, quizCompletions: 0, affiliateClicks: 0, advisorLeads: 0, proSignups: 0 });
  const [emailSources, setEmailSources] = useState<EmailSource[]>([]);
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([]);
  const [dailyCaptures, setDailyCaptures] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  useEffect(() => { fetchData(); }, [period]);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [views, emails, quiz, clicks, leads, pro, emailList, recentList] = await Promise.all([
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", since),
      supabase.from("email_captures").select("id, source, created_at, utm_source", { count: "exact" }).gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("quiz_leads").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("professional_leads").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("email_captures").select("source").gte("created_at", since),
      supabase.from("email_captures").select("email, source, created_at, utm_source").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    ]);

    setFunnel({
      pageViews: views.count || 0,
      emailCaptures: emails.count || 0,
      quizCompletions: quiz.count || 0,
      affiliateClicks: clicks.count || 0,
      advisorLeads: leads.count || 0,
      proSignups: pro.count || 0,
    });

    // Source breakdown
    const srcMap = new Map<string, number>();
    for (const e of emailList.data || []) {
      const src = (e as { source: string }).source || "unknown";
      srcMap.set(src, (srcMap.get(src) || 0) + 1);
    }
    setEmailSources([...srcMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count));

    // Recent captures
    setRecentCaptures((recentList.data || []) as RecentCapture[]);

    // Daily captures
    const dayMap = new Map<string, number>();
    for (const e of emails.data || []) {
      const day = new Date((e as { created_at: string }).created_at).toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    setDailyCaptures([...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])));

    setLoading(false);
  }

  const funnelSteps = useMemo(() => [
    { label: "Page Views", value: funnel.pageViews, color: "bg-blue-500" },
    { label: "Email Captures", value: funnel.emailCaptures, color: "bg-indigo-500" },
    { label: "Quiz Completions", value: funnel.quizCompletions, color: "bg-violet-500" },
    { label: "Affiliate Clicks", value: funnel.affiliateClicks, color: "bg-emerald-500" },
    { label: "Advisor Leads", value: funnel.advisorLeads, color: "bg-amber-500" },
  ], [funnel]);

  const maxFunnel = Math.max(...funnelSteps.map(s => s.value), 1);

  return (
    <AdminShell title="Funnel Dashboard" subtitle="Visitor journey from page view to conversion">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Period toggle */}
          <div className="flex gap-1.5 mb-5">
            {(["7d", "30d", "90d"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {p}
              </button>
            ))}
          </div>

          {/* Visual funnel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const pct = maxFunnel > 0 ? (step.value / maxFunnel) * 100 : 0;
                const prevValue = i > 0 ? (funnelSteps[i - 1]?.value ?? 0) : 0;
                const dropoff = prevValue > 0 ? ((1 - step.value / prevValue) * 100).toFixed(1) : null;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{step.value.toLocaleString()}</span>
                        {dropoff && i > 0 && <span className="text-[0.55rem] text-red-400">-{dropoff}%</span>}
                      </div>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${step.color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(1, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Key conversion rates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-lg font-extrabold text-slate-900">{funnel.pageViews > 0 ? ((funnel.emailCaptures / funnel.pageViews) * 100).toFixed(2) : 0}%</p>
                <p className="text-[0.6rem] text-slate-500">View → Email</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-slate-900">{funnel.pageViews > 0 ? ((funnel.affiliateClicks / funnel.pageViews) * 100).toFixed(2) : 0}%</p>
                <p className="text-[0.6rem] text-slate-500">View → Click</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-slate-900">{funnel.emailCaptures > 0 ? ((funnel.quizCompletions / funnel.emailCaptures) * 100).toFixed(1) : 0}%</p>
                <p className="text-[0.6rem] text-slate-500">Email → Quiz</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-slate-900">{funnel.emailCaptures + funnel.quizCompletions > 0 ? ((funnel.affiliateClicks / (funnel.emailCaptures + funnel.quizCompletions)) * 100).toFixed(1) : 0}%</p>
                <p className="text-[0.6rem] text-slate-500">Lead → Click</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Email captures by source */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Captures by Source</h3>
              <div className="space-y-2">
                {emailSources.map(s => (
                  <div key={s.source} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 truncate">{s.source}</span>
                    <span className="text-xs font-bold text-slate-900">{s.count}</span>
                  </div>
                ))}
                {emailSources.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No captures yet</p>}
              </div>
            </div>

            {/* Daily captures chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Captures</h3>
              {dailyCaptures.length > 1 ? (
                <div className="flex items-end gap-0.5 h-24">
                  {dailyCaptures.map(([day, count]) => {
                    const max = Math.max(...dailyCaptures.map(d => d[1]));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={day} className="flex-1 group relative">
                        <div className="bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all" style={{ height: `${Math.max(2, pct)}%` }} />
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[0.5rem] rounded whitespace-nowrap z-10">{day}: {count}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Not enough data yet</p>
              )}
            </div>

            {/* Recent captures */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Captures</h3>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {recentCaptures.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{c.email}</p>
                      <p className="text-[0.55rem] text-slate-400">{c.source}{c.utm_source ? ` · ${c.utm_source}` : ""}</p>
                    </div>
                    <span className="text-[0.55rem] text-slate-400 shrink-0 ml-2">{new Date(c.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
                {recentCaptures.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No captures yet</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

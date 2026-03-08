"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface Advisor {
  id: number;
  slug: string;
  full_name: string;
  type?: string;
  status: string;
}

interface ProfileView {
  professional_id: number;
  created_at: string;
}

interface Lead {
  id: number;
  professional_id: number;
  status: string;
  created_at: string;
  responded_at?: string;
}

interface Booking {
  professional_id: number;
  status: string;
}

interface AdvisorMetrics {
  id: number;
  name: string;
  slug: string;
  views: number;
  leads: number;
  bookings: number;
  conversionRate: number;
  avgResponseHrs: number | null;
}

type Period = "7d" | "30d" | "90d";

export default function AdvisorPerformancePage() {
  const [metrics, setMetrics] = useState<AdvisorMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [sortBy, setSortBy] = useState<"views" | "leads" | "conversionRate" | "avgResponseHrs">("leads");

  useEffect(() => { fetchData(); }, [period]);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [advisorsRes, viewsRes, leadsRes, bookingsRes] = await Promise.all([
      supabase.from("professionals").select("id, slug, full_name, type, status").eq("status", "active"),
      supabase.from("advisor_profile_views").select("professional_id, created_at").gte("created_at", since),
      supabase.from("professional_leads").select("id, professional_id, status, created_at").gte("created_at", since),
      supabase.from("advisor_bookings").select("professional_id, status").gte("created_at", since),
    ]);

    const advisors = (advisorsRes.data || []) as Advisor[];
    const views = (viewsRes.data || []) as ProfileView[];
    const leads = (leadsRes.data || []) as Lead[];
    const bookings = (bookingsRes.data || []) as Booking[];

    const result: AdvisorMetrics[] = advisors.map(a => {
      const aViews = views.filter(v => v.professional_id === a.id).length;
      const aLeads = leads.filter(l => l.professional_id === a.id);
      const aBookings = bookings.filter(b => b.professional_id === a.id).length;
      const convRate = aViews > 0 ? (aLeads.length / aViews) * 100 : 0;

      // Average response time (only for leads with responded_at)
      const responded = aLeads.filter(l => l.responded_at);
      let avgHrs: number | null = null;
      if (responded.length > 0) {
        const totalHrs = responded.reduce((sum, l) => {
          return sum + (new Date(l.responded_at!).getTime() - new Date(l.created_at).getTime()) / 3600000;
        }, 0);
        avgHrs = Math.round((totalHrs / responded.length) * 10) / 10;
      }

      return {
        id: a.id,
        name: a.full_name,
        slug: a.slug,
        views: aViews,
        leads: aLeads.length,
        bookings: aBookings,
        conversionRate: Math.round(convRate * 10) / 10,
        avgResponseHrs: avgHrs,
      };
    });

    setMetrics(result);
    setLoading(false);
  }

  const sorted = useMemo(() => {
    return [...metrics].sort((a, b) => {
      if (sortBy === "avgResponseHrs") {
        if (a.avgResponseHrs === null) return 1;
        if (b.avgResponseHrs === null) return -1;
        return a.avgResponseHrs - b.avgResponseHrs;
      }
      return (b[sortBy] as number) - (a[sortBy] as number);
    });
  }, [metrics, sortBy]);

  const totals = useMemo(() => ({
    views: metrics.reduce((s, m) => s + m.views, 0),
    leads: metrics.reduce((s, m) => s + m.leads, 0),
    bookings: metrics.reduce((s, m) => s + m.bookings, 0),
    advisors: metrics.length,
  }), [metrics]);

  return (
    <AdminShell title="Advisor Performance" subtitle="Per-advisor views, leads, response time, and conversion rates">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          <div className="flex gap-1.5 mb-5">
            {(["7d", "30d", "90d"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${period === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p}</button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Active Advisors</p>
              <p className="text-2xl font-extrabold text-slate-900">{totals.advisors}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Profile Views</p>
              <p className="text-2xl font-extrabold text-slate-900">{totals.views.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Enquiries</p>
              <p className="text-2xl font-extrabold text-slate-900">{totals.leads}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <p className="text-[0.6rem] font-bold uppercase opacity-80">Bookings</p>
              <p className="text-2xl font-extrabold">{totals.bookings}</p>
              <p className="text-[0.55rem] opacity-70">{totals.views > 0 ? ((totals.leads / totals.views) * 100).toFixed(1) : 0}% view→lead</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500">Advisor</th>
                    {[
                      { key: "views" as const, label: "Views" },
                      { key: "leads" as const, label: "Leads" },
                      { key: "conversionRate" as const, label: "Conv %" },
                      { key: "avgResponseHrs" as const, label: "Avg Response" },
                    ].map(col => (
                      <th key={col.key} className="px-3 py-3 text-xs font-bold text-slate-500 text-right cursor-pointer hover:text-slate-900" onClick={() => setSortBy(col.key)}>
                        {col.label} {sortBy === col.key && "↓"}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-xs font-bold text-slate-500 text-right">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((m, i) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/advisor/${m.slug}`} className="font-semibold text-slate-900 hover:text-blue-600 text-sm">{m.name}</Link>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{m.views}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{m.leads}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-xs font-bold ${m.conversionRate >= 5 ? "text-emerald-600" : m.conversionRate >= 2 ? "text-amber-600" : "text-slate-400"}`}>
                          {m.conversionRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {m.avgResponseHrs !== null ? (
                          <span className={`text-xs font-bold ${m.avgResponseHrs <= 4 ? "text-emerald-600" : m.avgResponseHrs <= 24 ? "text-amber-600" : "text-red-500"}`}>
                            {m.avgResponseHrs < 1 ? `${Math.round(m.avgResponseHrs * 60)}m` : `${m.avgResponseHrs}h`}
                          </span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{m.bookings}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No active advisors</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[0.55rem] text-slate-400 mt-3 text-center">
            Response time = time between lead submission and advisor&apos;s first action. Conversion = leads ÷ profile views.
          </p>
        </>
      )}
    </AdminShell>
  );
}

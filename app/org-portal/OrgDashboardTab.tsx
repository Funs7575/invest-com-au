"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation, OrgStats, OrgViewType } from "./types";

interface RecentEnrollment {
  user_name: string;
  course_title: string;
  enrolled_at: string;
  amount_cents: number;
}

type Props = {
  org: Organisation | null;
  /** Legacy prop — component fetches its own stats for freshness. */
  stats?: OrgStats | null;
  onNavigate: (v: OrgViewType) => void;
};

export default function OrgDashboardTab({ org, onNavigate }: Props) {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/stats");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setStats(data.stats ?? null);
          setRecentEnrollments(data.recent_enrollments ?? []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const revenueThisMonth = ((stats?.revenue_this_month_cents ?? 0) / 100).toFixed(0);
  const totalRevenue = ((stats?.total_revenue_cents ?? 0) / 100).toFixed(0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-32 bg-slate-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-xl h-24" />
          ))}
        </div>
        <div className="bg-slate-100 rounded-xl h-40" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Welcome{org ? `, ${org.name}` : ""}
      </h1>
      <p className="text-sm text-slate-500 mb-6">Organisation Dashboard</p>

      {/* Stripe Connect banner */}
      {org && !org.stripe_connect_payouts_enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <Icon name="dollar-sign" size={16} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-amber-900">Connect Stripe to receive payouts</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need a Stripe Connect account to receive payments from course enrollments.
            </p>
          </div>
          <button
            onClick={() => onNavigate("billing")}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors"
          >
            Connect Stripe
          </button>
        </div>
      )}

      {/* KPI cards — 6 stats in a 2×3 / 3×2 grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          {
            label: "Enrollments This Month",
            value: stats?.enrollments_this_month ?? 0,
            icon: "users",
            color: "text-teal-600",
            bg: "bg-teal-50",
          },
          {
            label: "Revenue This Month",
            value: `$${revenueThisMonth}`,
            icon: "dollar-sign",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Active Courses",
            value: stats?.active_courses ?? 0,
            icon: "book-open",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Total Enrollments",
            value: stats?.total_enrollments ?? 0,
            icon: "user-check",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Total Revenue",
            value: `$${totalRevenue}`,
            icon: "trending-up",
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
          {
            label: "CPD Hours Issued",
            value: stats?.cpd_hours_issued ?? 0,
            icon: "award",
            color: "text-rose-600",
            bg: "bg-rose-50",
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
              <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                <Icon name={kpi.icon} size={16} className={kpi.color} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Enrollments */}
      <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Recent Enrollments</h2>
          <button
            onClick={() => onNavigate("students")}
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
          >
            View all
          </button>
        </div>
        {recentEnrollments.length === 0 ? (
          <div className="py-8 text-center">
            <Icon name="users" size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No enrollments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Course</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEnrollments.map((e, i) => (
                  <tr key={i} className="text-xs hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{e.user_name}</td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">{e.course_title}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">
                      ${(e.amount_cents / 100).toFixed(0)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(e.enrolled_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate("courses")}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all"
        >
          <Icon name="plus" size={20} className="text-teal-600 mb-2" />
          <div className="text-sm font-bold text-slate-900">Add Course</div>
          <div className="text-xs text-slate-500">Create a new CPD course</div>
        </button>
        <button
          onClick={() => onNavigate("students")}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all"
        >
          <Icon name="users" size={20} className="text-blue-600 mb-2" />
          <div className="text-sm font-bold text-slate-900">View Students</div>
          <div className="text-xs text-slate-500">
            {(stats?.total_enrollments ?? 0).toLocaleString()} total enrollments
          </div>
        </button>
        <button
          onClick={() => onNavigate("billing")}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all"
        >
          <Icon name="dollar-sign" size={20} className="text-emerald-600 mb-2" />
          <div className="text-sm font-bold text-slate-900">View Billing</div>
          <div className="text-xs text-slate-500">
            ${totalRevenue} total earned
          </div>
        </button>
      </div>
    </>
  );
}

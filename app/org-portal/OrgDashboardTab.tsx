"use client";

import Icon from "@/components/Icon";
import type { Organisation, OrgStats, OrgViewType } from "./types";

type Props = {
  org: Organisation | null;
  stats: OrgStats | null;
  onNavigate: (v: OrgViewType) => void;
};

export default function OrgDashboardTab({ org, stats, onNavigate }: Props) {
  const revenueThisMonth = ((stats?.revenue_this_month_cents ?? 0) / 100).toFixed(0);

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
            label: "CPD Hours Issued",
            value: stats?.cpd_hours_issued ?? 0,
            icon: "award",
            color: "text-violet-600",
            bg: "bg-violet-50",
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
            ${((stats?.total_revenue_cents ?? 0) / 100).toFixed(0)} total earned
          </div>
        </button>
      </div>
    </>
  );
}

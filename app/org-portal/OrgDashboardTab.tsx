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
  stats?: OrgStats | null;
  onNavigate: (v: OrgViewType) => void;
};

interface QuickLink {
  label: string;
  description: string;
  href: string;
  icon: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    label: "ASIC Professional Registers",
    description: "Verify adviser licensing and CPD compliance",
    href: "https://connectonline.asic.gov.au/RegistrantSearch/faces/landing/searchRego.jspx",
    icon: "shield",
  },
  {
    label: "Tax Practitioners Board",
    description: "CPD requirements for registered tax agents",
    href: "https://www.tpb.gov.au/cpd-requirements",
    icon: "file-text",
  },
  {
    label: "FPA CPD Standards",
    description: "Financial Planning Association CPD framework",
    href: "https://fpa.com.au/members/cpd/",
    icon: "award",
  },
  {
    label: "FAAA CPD Framework",
    description: "Financial Advice Association Australia",
    href: "https://faaa.com.au/cpd",
    icon: "book-open",
  },
  {
    label: "ASIC RG 105 Guide",
    description: "AFS licensing — CPD obligations reference",
    href: "https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-105-afs-licensing-requirements/",
    icon: "external-link",
  },
  {
    label: "Stripe Connect Dashboard",
    description: "View payouts, disputes, and account details",
    href: "https://dashboard.stripe.com/connect/accounts/overview",
    icon: "dollar-sign",
  },
];

/** Derive a checklist item's done state from org + stats. */
function buildChecklist(org: Organisation | null, stats: OrgStats | null) {
  const teamCount = stats?.team_member_count ?? 0;
  return [
    {
      id: "cpd_provider",
      label: "Apply for a CPD provider number",
      detail: org?.cpd_provider_number
        ? `Provider #${org.cpd_provider_number}`
        : "Required for ASIC-recognised CPD. Apply via your professional association.",
      done: Boolean(org?.cpd_provider_number),
      action: null as string | null,
    },
    {
      id: "first_course",
      label: "List your first course",
      detail:
        (stats?.active_courses ?? 0) > 0
          ? `${stats?.active_courses} course${(stats?.active_courses ?? 0) === 1 ? "" : "s"} published`
          : "Create a CPD course so learners can enroll.",
      done: (stats?.active_courses ?? 0) > 0,
      action: "courses" as OrgViewType | null,
    },
    {
      id: "stripe",
      label: "Set up Stripe Connect for payouts",
      detail: org?.stripe_connect_payouts_enabled
        ? "Payouts enabled — you'll receive funds from enrollments."
        : "Required before you can collect enrollment fees.",
      done: Boolean(org?.stripe_connect_payouts_enabled),
      action: "billing" as OrgViewType | null,
    },
    {
      id: "team",
      label: "Invite team members",
      detail:
        teamCount > 0
          ? `${teamCount} team member${teamCount === 1 ? "" : "s"} active`
          : "Grant staff access to manage courses and view reports.",
      done: teamCount > 0,
      action: "team" as OrgViewType | null,
    },
  ];
}

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

  const totalEnrollments = stats?.total_enrollments ?? 0;
  const totalRevenueCents = stats?.total_revenue_cents ?? 0;
  const avgRevenue =
    totalEnrollments > 0
      ? `$${(totalRevenueCents / totalEnrollments / 100).toFixed(0)}`
      : "$0";

  const checklist = buildChecklist(org, stats);
  const completedSteps = checklist.filter((c) => c.done).length;
  const allDone = completedSteps === checklist.length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-32 bg-slate-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
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
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors"
          >
            Connect Stripe
          </button>
        </div>
      )}

      {/* KPI cards — 3×3 grid */}
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
            value: totalEnrollments,
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
          {
            label: "Avg. Revenue / Enrollment",
            value: avgRevenue,
            icon: "bar-chart-2",
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "CPD Hours per Enrollment",
            value:
              totalEnrollments > 0
                ? ((stats?.cpd_hours_issued ?? 0) / totalEnrollments).toFixed(1)
                : "0",
            icon: "clock",
            color: "text-cyan-600",
            bg: "bg-cyan-50",
          },
          {
            label: "Team Members",
            value: stats?.team_member_count ?? 0,
            icon: "user-plus",
            color: "text-pink-600",
            bg: "bg-pink-50",
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
                  <th scope="col" className="px-4 py-2.5">Student</th>
                  <th scope="col" className="px-4 py-2.5">Course</th>
                  <th scope="col" className="px-4 py-2.5">Amount</th>
                  <th scope="col" className="px-4 py-2.5">Date</th>
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

      {/* Getting Started checklist — hidden once all steps done */}
      {!allDone && (
        <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Getting Started</h2>
            <span className="text-xs text-slate-500 font-medium">
              {completedSteps}/{checklist.length} complete
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {checklist.map((step) => (
              <li key={step.id} className="px-4 py-3 flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    step.done
                      ? "bg-teal-500 border-teal-500"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {step.done && (
                    <Icon name="check" size={11} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
                </div>
                {!step.done && step.action && (
                  <button
                    onClick={() => onNavigate(step.action as OrgViewType)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold whitespace-nowrap mt-0.5"
                  >
                    Go &rarr;
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Quick Links</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-slate-100">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-b-0 sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(3n)]:border-r-0"
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-teal-50 transition-colors">
                <Icon name={link.icon} size={16} className="text-slate-500 group-hover:text-teal-600 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{link.description}</p>
              </div>
              <Icon name="external-link" size={12} className="text-slate-300 shrink-0 mt-0.5 group-hover:text-teal-400 transition-colors" />
            </a>
          ))}
        </div>
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
            {totalEnrollments.toLocaleString()} total enrollments
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

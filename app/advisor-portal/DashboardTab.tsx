"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import type { Advisor, Stats, Lead, ProfileCompleteness, Review, ViewDay, WeeklyEnquiry, ViewType } from "./types";

type Props = {
  advisor: Advisor | null;
  stats: Stats | null;
  leads: Lead[];
  profileCompleteness: ProfileCompleteness | null;
  reviews: Review[];
  viewsByDay: ViewDay[];
  weeklyEnquiries: WeeklyEnquiry[];
  dismissedOnboarding: boolean;
  isPending: boolean;
  onNavigate: (v: ViewType) => void;
  onDismissOnboarding: () => void;
};

export default function DashboardTab({
  advisor, stats, leads, profileCompleteness, reviews,
  viewsByDay, weeklyEnquiries, dismissedOnboarding, isPending,
  onNavigate, onDismissOnboarding,
}: Props) {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Welcome{isPending ? "" : " back"}, {advisor?.name?.split(" ")[0]}</h1>
      <p className="text-sm text-slate-500 mb-6">{advisor?.firm_name || PROFESSIONAL_TYPE_LABELS[advisor?.type as keyof typeof PROFESSIONAL_TYPE_LABELS]}</p>

      {advisor?.profile_complete && !advisor?.booking_link && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Icon name="calendar" size={22} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm text-amber-900">
              Add a booking link — your profile is ready, investors can&rsquo;t schedule yet
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Calendly, SavvyCal or any scheduling URL. Advisors with a booking link convert 2-4x more enquiries.
            </p>
          </div>
          <button
            onClick={() => onNavigate("profile")}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Add booking link
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Profile Views", value: stats?.totalViews30d || 0, sub: "last 30 days", icon: "eye", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Enquiries", value: stats?.leads30d || 0, sub: "last 30 days", icon: "inbox", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Booking Clicks", value: stats?.bookingClicks30d || 0, sub: "last 30 days", icon: "calendar", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Rating", value: stats?.avgRating || (advisor?.rating ? Number(advisor.rating).toFixed(1) : "—"), sub: `${stats?.reviewCount || advisor?.review_count || 0} reviews`, icon: "star", color: "text-amber-600", bg: "bg-amber-50" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
              <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center`}><Icon name={kpi.icon} size={16} className={kpi.color} /></div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}</div>
            <div className="text-[0.62rem] text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Credit balance banner */}
      {(() => {
        const balance = advisor?.credit_balance_cents || 0;
        const leadPrice = advisor?.lead_price_cents || 3980;
        const freeLeadsUsed = advisor?.free_leads_used || 0;
        const hasFreeLeads = freeLeadsUsed < 2;
        const leadsRemaining = hasFreeLeads ? (2 - freeLeadsUsed) : Math.floor(balance / leadPrice);
        const isLow = !hasFreeLeads && leadsRemaining <= 2 && balance > 0;
        const isEmpty = !hasFreeLeads && balance <= 0;

        return (
          <>
            {isEmpty && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="alert-triangle" size={16} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">Credit balance empty — leads paused</p>
                  <p className="text-xs text-red-600 mt-0.5">You won&rsquo;t receive new enquiries until you top up your credit balance.</p>
                </div>
                <button
                  onClick={() => onNavigate("billing")}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shrink-0"
                >
                  Top Up Now
                </button>
              </div>
            )}
            {isLow && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="alert-triangle" size={16} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">Low credit balance — {leadsRemaining} lead{leadsRemaining !== 1 ? "s" : ""} remaining</p>
                  <p className="text-xs text-amber-600 mt-0.5">Top up soon to avoid missing incoming enquiries.</p>
                </div>
                <button
                  onClick={() => onNavigate("billing")}
                  className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors shrink-0"
                >
                  Top Up
                </button>
              </div>
            )}
            <div className={`rounded-xl p-4 mb-6 text-white flex items-center justify-between ${isEmpty ? "bg-gradient-to-r from-red-700 to-red-900" : isLow ? "bg-gradient-to-r from-amber-500 to-amber-700" : "bg-gradient-to-r from-violet-600 to-violet-800"}`}>
              <div>
                <p className={`text-[0.65rem] font-semibold uppercase tracking-wider ${isEmpty ? "text-red-200" : isLow ? "text-amber-100" : "text-violet-200"}`}>Lead Credit Balance</p>
                <p className="text-2xl font-extrabold">${(balance / 100).toFixed(0)}</p>
                <p className={`text-[0.62rem] mt-0.5 ${isEmpty ? "text-red-200" : isLow ? "text-amber-100" : "text-violet-200"}`}>
                  {hasFreeLeads
                    ? `${2 - freeLeadsUsed} free leads remaining`
                    : isEmpty
                      ? "No credits — top up to receive leads"
                      : `~${leadsRemaining} leads remaining`
                  }
                </p>
              </div>
              <button
                onClick={() => onNavigate("billing")}
                className="px-5 py-2.5 bg-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity shrink-0 text-slate-800"
              >
                Buy Credits
              </button>
            </div>
          </>
        );
      })()}

      {/* Onboarding Checklist */}
      {profileCompleteness && profileCompleteness.score < 80 && !dismissedOnboarding && (
        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-violet-900">Get your profile ready</h3>
              <p className="text-xs text-violet-600 mt-0.5">Complete these steps to start receiving leads</p>
            </div>
            <button onClick={onDismissOnboarding} className="text-violet-400 hover:text-violet-600 text-xs" title="Dismiss">✕</button>
          </div>
          <div className="space-y-2 mb-4">
            {[
              { label: "Add a profile photo", done: !!advisor?.photo_url, action: () => onNavigate("profile") },
              { label: "Write a bio", done: !!advisor?.bio && advisor.bio.length > 30, action: () => onNavigate("profile") },
              { label: "Add your specialties", done: (advisor?.specialties?.length || 0) > 0, action: () => onNavigate("profile") },
              { label: "Set your fee structure", done: !!advisor?.fee_structure, action: () => onNavigate("profile") },
              { label: "Add a booking link", done: !!advisor?.booking_link, action: () => onNavigate("profile") },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${step.done ? "opacity-50" : "cursor-pointer hover:bg-violet-50"}`} onClick={step.done ? undefined : step.action}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-500" : "bg-white border-2 border-violet-300"}`}>
                  {step.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-xs font-medium ${step.done ? "line-through text-slate-400" : "text-slate-700"}`}>{step.label}</span>
                {!step.done && <svg className="w-3.5 h-3.5 text-violet-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${profileCompleteness.score}%` }} />
            </div>
            <span className="text-xs font-bold text-violet-700">{profileCompleteness.score}%</span>
          </div>
        </div>
      )}

      {/* Profile Completeness (compact) */}
      {profileCompleteness && profileCompleteness.score < 100 && (profileCompleteness.score >= 80 || dismissedOnboarding) && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900">Profile Completeness</h3>
            <span className={`text-sm font-extrabold ${profileCompleteness.score >= 80 ? "text-emerald-600" : profileCompleteness.score >= 50 ? "text-amber-600" : "text-red-500"}`}>
              {profileCompleteness.score}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                profileCompleteness.score >= 80 ? "bg-emerald-500" : profileCompleteness.score >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${profileCompleteness.score}%` }}
            />
          </div>
          {profileCompleteness.missingFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[0.62rem] text-slate-500 mr-1">Missing:</span>
              {profileCompleteness.missingFields.map((f) => (
                <button
                  key={f}
                  onClick={() => onNavigate("profile")}
                  className="text-[0.58rem] font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enquiries Per Week chart */}
      {weeklyEnquiries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Enquiries Per Week</h3>
          <p className="text-[0.62rem] text-slate-400 mb-4">Last 8 weeks</p>
          <div className="flex items-end gap-2 h-28">
            {weeklyEnquiries.map((w, i) => {
              const max = Math.max(...weeklyEnquiries.map(wk => wk.count), 1);
              const pct = (w.count / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-[0.56rem] font-bold text-slate-700">{w.count}</span>
                  <div
                    className="w-full bg-violet-500 rounded-t-md transition-all duration-300 hover:bg-violet-600"
                    style={{ height: `${Math.max(pct, 4)}%`, minHeight: "3px" }}
                    title={`${w.weekLabel}: ${w.count} enquiries`}
                  />
                  <span className="text-[0.5rem] text-slate-400 whitespace-nowrap">{w.weekLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile Views chart */}
      {viewsByDay.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Profile Views</h3>
          <p className="text-[0.62rem] text-slate-400 mb-3">Daily views over the last 30 days</p>
          <div className="flex items-end gap-0.5 h-20">
            {viewsByDay.map((d, i) => {
              const max = Math.max(...viewsByDay.map(v => v.view_count), 1);
              const pct = (d.view_count / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.view_date}: ${d.view_count} views`}>
                  <div className="w-full bg-blue-500 rounded-sm min-h-[2px] hover:bg-blue-600 transition-colors" style={{ height: `${Math.max(pct, 3)}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Enquiries table */}
      <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent Enquiries</h3>
          <button onClick={() => onNavigate("leads")} className="text-xs text-violet-600 hover:text-violet-700 font-semibold">View All &rarr;</button>
        </div>
        {leads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Icon name="inbox" size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No enquiries yet. They&apos;ll appear here when investors contact you.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-center">Quality</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id} className={`text-xs ${lead.status === "new" ? "bg-violet-50/40" : "hover:bg-slate-50"} transition-colors`}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{lead.user_name}</div>
                      <div className="text-[0.58rem] text-slate-400">{lead.user_email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {lead.quality_score != null ? (
                        <LeadScoreBadge score={lead.quality_score} signals={lead.quality_signals} tier={lead.lead_tier} compact />
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[0.56rem] font-bold px-2 py-0.5 rounded-full ${
                        lead.status === "new" ? "bg-violet-100 text-violet-700" :
                        lead.status === "contacted" ? "bg-blue-100 text-blue-700" :
                        lead.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                        lead.status === "lost" ? "bg-red-100 text-red-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>{lead.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-50 truncate">
                      {lead.message ? lead.message.slice(0, 80) + (lead.message.length > 80 ? "..." : "") : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Latest Reviews */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Latest Reviews</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 text-sm">{"★".repeat(Math.round(Number(stats?.avgRating || advisor?.rating || 0)))}</span>
              <span className="text-xs font-bold text-slate-700">{stats?.avgRating || (advisor?.rating ? Number(advisor.rating).toFixed(1) : "N/A")}</span>
              <span className="text-[0.62rem] text-slate-400">({stats?.reviewCount || 0})</span>
            </div>
          )}
        </div>
        {reviews.length === 0 ? (
          <div className="py-6 text-center">
            <Icon name="star" size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No reviews yet. Ask happy clients to leave a review on your profile.</p>
            <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="inline-block mt-2 text-xs font-semibold text-violet-600 hover:text-violet-700">Share review link &rarr;</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 4).map((r) => (
              <div key={r.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-[0.56rem] font-bold text-violet-700">
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                      <div className="text-[0.56rem] text-slate-400">{new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-sm ${s <= r.rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
                    ))}
                  </div>
                </div>
                {r.title && <div className="text-xs font-semibold text-slate-800 mb-1">{r.title}</div>}
                {r.body && <p className="text-xs text-slate-600 leading-relaxed">{r.body.slice(0, 200)}{r.body.length > 200 ? "..." : ""}</p>}
                {(r.communication_rating || r.expertise_rating || r.value_for_money_rating) && (
                  <div className="flex gap-3 mt-2">
                    {r.communication_rating && <span className="text-[0.56rem] text-slate-400">Communication: <strong className="text-slate-600">{r.communication_rating}/5</strong></span>}
                    {r.expertise_rating && <span className="text-[0.56rem] text-slate-400">Expertise: <strong className="text-slate-600">{r.expertise_rating}/5</strong></span>}
                    {r.value_for_money_rating && <span className="text-[0.56rem] text-slate-400">Value: <strong className="text-slate-600">{r.value_for_money_rating}/5</strong></span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button onClick={() => onNavigate("profile")} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all">
          <Icon name="user" size={20} className="text-violet-600 mb-2" />
          <div className="text-sm font-bold text-slate-900">Edit Profile</div>
          <div className="text-xs text-slate-500">Update bio, fees, specialties</div>
        </button>
        <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all">
          <Icon name="external-link" size={20} className="text-blue-600 mb-2" />
          <div className="text-sm font-bold text-slate-900">View Public Profile</div>
          <div className="text-xs text-slate-500">See how investors see you</div>
        </Link>
        <button onClick={() => onNavigate("billing")} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all">
          <Icon name="credit-card" size={20} className="text-emerald-600 mb-2" />
          <div className="text-sm font-bold text-slate-900">Billing</div>
          <div className="text-xs text-slate-500">{stats?.pendingBilledCents ? `$${(stats.pendingBilledCents / 100).toFixed(0)} pending` : "No charges yet"}</div>
        </button>
      </div>
    </>
  );
}

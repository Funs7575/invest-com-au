"use client";

import Icon from "@/components/Icon";
import type { Advisor, Stats, Lead, ProfileCompleteness, ViewType } from "./types";

type Props = {
  stats: Stats | null;
  advisor: Advisor | null;
  leads: Lead[];
  profileCompleteness: ProfileCompleteness | null;
  onNavigate: (v: ViewType) => void;
};

export default function AnalyticsTab({ stats, advisor, leads, profileCompleteness, onNavigate }: Props) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-slate-900">Performance Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">How your profile and content are performing across invest.com.au</p>
      </div>

      {/* Top-level metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Profile Views", value: stats?.totalViews30d || 0, sub: "last 30 days", icon: "eye", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Enquiries", value: stats?.leads30d || 0, sub: "last 30 days", icon: "inbox", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Conversion Rate", value: stats?.conversionRate || "0%", sub: "views → enquiries", icon: "target", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Rating", value: advisor?.rating ? `${advisor.rating}/5` : "—", sub: `${advisor?.review_count || 0} reviews`, icon: "star", color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 md:p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <Icon name={s.icon} size={16} className={s.color} />
            </div>
            <p className="text-lg md:text-2xl font-bold text-slate-900">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
            <p className="text-[0.6rem] md:text-xs text-slate-500">{s.label}</p>
            <p className="text-[0.55rem] md:text-[0.6rem] text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Engagement breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Engagement Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Phone Clicks", value: stats?.phoneClicks || 0, icon: "phone" },
            { label: "Website Visits", value: stats?.websiteClicks || 0, icon: "globe" },
            { label: "Booking Clicks", value: stats?.bookingClicks || 0, icon: "calendar" },
            { label: "Article Views", value: stats?.articleViews || 0, icon: "file-text" },
            { label: "Search Appearances", value: stats?.searchImpressions || 0, icon: "search" },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50">
              <Icon name={m.icon} size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">{m.value.toLocaleString()}</p>
                <p className="text-[0.55rem] text-slate-400">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead funnel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Lead Funnel</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Total Leads", value: stats?.totalLeads || 0, color: "bg-blue-100 text-blue-700" },
            { label: "Contacted", value: leads.filter(l => l.status === "contacted").length, color: "bg-amber-100 text-amber-700" },
            { label: "Converted", value: stats?.convertedLeads || 0, color: "bg-emerald-100 text-emerald-700" },
            { label: "Lost", value: leads.filter(l => l.status === "lost").length, color: "bg-slate-100 text-slate-600" },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-3 ${s.color}`}>
              <p className="text-lg md:text-xl font-bold">{s.value}</p>
              <p className="text-[0.55rem] md:text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Article performance */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Article Performance</h3>
        <p className="text-[0.6rem] text-slate-400 mb-3">How your published expert articles are performing</p>
        {(stats?.articles || []).length > 0 ? (
          <div className="space-y-2">
            {(stats?.articles as { title: string; views: number; clicks: number; slug: string }[] || []).map((art, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{art.title}</p>
                </div>
                <div className="flex items-center gap-4 text-[0.6rem] text-slate-500 shrink-0 ml-3">
                  <span><strong className="text-slate-700">{art.views}</strong> views</span>
                  <span><strong className="text-slate-700">{art.clicks}</strong> profile clicks</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-400">
            <Icon name="file-text" size={24} className="text-slate-300 mx-auto mb-2" />
            No articles published yet. <button onClick={() => onNavigate("articles")} className="text-violet-600 hover:text-violet-800 font-medium">Write one →</button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <Icon name="lightbulb" size={16} className="text-amber-500" />
          Tips to Improve Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
          {[
            profileCompleteness && profileCompleteness.score < 100 ? `Complete your profile (${profileCompleteness.score}%) — complete profiles get 3x more enquiries` : null,
            !advisor?.photo_url?.startsWith("http") || advisor?.photo_url?.includes("ui-avatars") ? "Add a real profile photo — advisors with photos get 2.5x more clicks" : null,
            !advisor?.booking_link ? "Add a booking link — lets investors schedule directly from your profile" : null,
            (stats?.articles || []).length === 0 ? "Publish an expert article — advisors with articles get 40% more profile views" : null,
            advisor?.review_count === 0 ? "Ask a client to leave a review — ratings build trust with new enquiries" : null,
          ].filter(Boolean).map((tip, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
              <Icon name="arrow-right" size={12} className="text-violet-500 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
          {[profileCompleteness?.score === 100, advisor?.photo_url && !advisor.photo_url.includes("ui-avatars"), advisor?.booking_link, (stats?.articles || []).length > 0, (advisor?.review_count || 0) > 0].every(Boolean) && (
            <div className="col-span-full text-center py-2 text-emerald-600 font-medium">
              <Icon name="check-circle" size={16} className="inline mr-1" />
              Your profile is fully optimised!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

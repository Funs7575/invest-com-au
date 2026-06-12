"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import PricingPositionCard from "./PricingPositionCard";
import type { Advisor, Stats, Lead, ProfileCompleteness, ViewType } from "./types";
import type { BenchmarksResponse } from "@/app/api/advisor-auth/benchmarks/route";
import type { ProfileScoreResponse } from "@/app/api/advisor-auth/profile-score/route";

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Render a single benchmark comparison row. */
function BenchmarkRow({
  label,
  yours,
  peerMedian,
  peerTop25: _peerTop25,
  format,
  lowerIsBetter = false,
}: {
  label: string;
  yours: number | null;
  peerMedian: number | null;
  peerTop25?: number | null;
  format: (v: number | null) => string;
  lowerIsBetter?: boolean;
}) {
  const compareToMedian = (a: number | null, b: number | null): "better" | "worse" | "equal" | "unknown" => {
    if (a === null || b === null) return "unknown";
    if (lowerIsBetter) return a < b ? "better" : a > b ? "worse" : "equal";
    return a > b ? "better" : a < b ? "worse" : "equal";
  };
  const vsMedian = compareToMedian(yours, peerMedian);

  const indicatorClass =
    vsMedian === "better"
      ? "text-emerald-600 bg-emerald-50"
      : vsMedian === "worse"
        ? "text-red-500 bg-red-50"
        : "text-slate-500 bg-slate-100";

  const indicatorLabel =
    vsMedian === "better" ? (lowerIsBetter ? "Faster" : "Above avg") :
    vsMedian === "worse"  ? (lowerIsBetter ? "Slower" : "Below avg") :
    vsMedian === "equal"  ? "At avg" : "—";

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center py-2 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-slate-700 font-medium">{label}</span>
      <span className="font-bold text-slate-900 text-right">{format(yours)}</span>
      <span className="text-slate-500 text-right">{format(peerMedian)}</span>
      <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-right ${indicatorClass}`}>
        {indicatorLabel}
      </span>
    </div>
  );
}

type Props = {
  stats: Stats | null;
  advisor: Advisor | null;
  leads: Lead[];
  profileCompleteness: ProfileCompleteness | null;
  onNavigate: (v: ViewType) => void;
};

export default function AnalyticsTab({ stats, advisor, leads, profileCompleteness, onNavigate }: Props) {
  const [benchmarks, setBenchmarks] = useState<BenchmarksResponse | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);
  const [benchmarkError, setBenchmarkError] = useState(false);

  const [profileScore, setProfileScore] = useState<ProfileScoreResponse | null>(null);
  const [profileScoreLoading, setProfileScoreLoading] = useState(true);
  const [profileScoreError, setProfileScoreError] = useState(false);

  const [exportPeriod, setExportPeriod] = useState<"30d" | "90d" | "all">("30d");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [benchmarkNotifyToast, setBenchmarkNotifyToast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/advisor-auth/benchmarks");
        if (!r.ok) throw new Error("fetch failed");
        const data = await r.json() as BenchmarksResponse;
        if (!cancelled) { setBenchmarks(data); setBenchmarkLoading(false); }
      } catch {
        if (!cancelled) { setBenchmarkError(true); setBenchmarkLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/advisor-auth/profile-score");
        if (!r.ok) throw new Error("fetch failed");
        const data = await r.json() as ProfileScoreResponse;
        if (!cancelled) { setProfileScore(data); setProfileScoreLoading(false); }
      } catch {
        if (!cancelled) { setProfileScoreError(true); setProfileScoreLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleExportCsv() {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      const r = await fetch(`/api/advisor-auth/analytics/export?period=${exportPeriod}`);
      if (!r.ok) {
        const body = await r.json() as { error?: string };
        setExportError(body.error ?? "Export failed. Please try again.");
        return;
      }
      const blob = await r.blob();
      const disposition = r.headers.get("Content-Disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(disposition);
      const filename = filenameMatch?.[1] ?? `leads-${exportPeriod}.csv`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Performance Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">How your profile and content are performing across invest.com.au</p>
        </div>

        {/* CSV Export */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            aria-label="Export period"
            value={exportPeriod}
            onChange={(e) => setExportPeriod(e.target.value as "30d" | "90d" | "all")}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => void handleExportCsv()}
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name={exporting ? "loader" : "download"} size={13} className={exporting ? "animate-spin" : ""} aria-hidden="true" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            {exportError && <p role="alert" className="text-xs text-red-600">{exportError}</p>}
          </div>
        </div>
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
            <p className="text-[0.55rem] md:text-[0.6rem] text-slate-500">{s.sub}</p>
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
              <Icon name={m.icon} size={16} className="text-slate-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">{m.value.toLocaleString()}</p>
                <p className="text-[0.55rem] text-slate-500">{m.label}</p>
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

      {/* Lead performance: accept rate + period trend */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Lead Performance</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{stats?.acceptRate ?? 0}%</p>
            <p className="text-[0.6rem] text-slate-500 mt-1">Accept Rate</p>
            <p className="text-[0.55rem] text-slate-500 mt-0.5">
              {(stats?.acceptRate ?? 0) >= 60 ? "Excellent" : (stats?.acceptRate ?? 0) >= 40 ? "Average — aim for 60%" : "Low — aim for 60%+"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{stats?.leadsThisMonth ?? 0}</p>
            <p className="text-[0.6rem] text-slate-500 mt-1">This Month</p>
            <p className="text-[0.55rem] text-slate-500 mt-0.5">{stats?.leads7d ?? 0} in last 7 days</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            {(() => {
              const thisMonth = stats?.leadsThisMonth ?? 0;
              const lastMonth = stats?.leadsLastMonth ?? 0;
              const delta = thisMonth - lastMonth;
              const pct = lastMonth > 0 ? Math.round((delta / lastMonth) * 100) : null;
              const isUp = delta >= 0;
              return (
                <>
                  <p className={`text-xl font-bold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                    {isUp ? "▲" : "▼"} {Math.abs(delta)}
                  </p>
                  <p className="text-[0.6rem] text-slate-500 mt-1">vs Last Month</p>
                  <p className="text-[0.55rem] text-slate-500 mt-0.5">
                    {pct !== null ? `${pct >= 0 ? "+" : ""}${pct}% change` : "No prior data"}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Response time */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Response Performance</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-2xl md:text-3xl font-bold text-slate-900">
              {formatResponseTime(stats?.avgResponseTimeMinutes ?? null)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Avg. time to first response</p>
            <p className="text-[0.6rem] text-slate-500 mt-0.5">
              {stats?.avgResponseTimeMinutes == null
                ? "No responded leads yet"
                : stats.avgResponseTimeMinutes <= 30
                  ? "Excellent — faster than 90% of advisors"
                  : stats.avgResponseTimeMinutes <= 120
                    ? "Good — aim for under 30 min to maximise conversion"
                    : "Slow — leads convert 3× better when responded to within 30 min"}
            </p>
          </div>
          <div className="hidden md:flex flex-col gap-2 text-xs text-slate-600 shrink-0 max-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Under 30 min — highest conversion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>30 min – 2 h — good</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span>Over 2 h — conversion drops sharply</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article performance — only render the card when there are articles; otherwise show a standalone empty state CTA */}
      {(stats?.articles || []).length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Article Performance</h3>
          <p className="text-[0.6rem] text-slate-500 mb-3">How your published expert articles are performing</p>
          <div className="space-y-2">
            {(stats?.articles as { title: string; views: number; clicks: number; slug: string }[]).map((art, i) => (
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
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
          <Icon name="file-text" size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">No articles yet</p>
          <p className="text-xs text-slate-500 mb-3">Advisors with expert articles get 40% more profile views.</p>
          <button
            onClick={() => onNavigate("articles")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <Icon name="pencil" size={12} />
            Write your first article
          </button>
        </div>
      )}

      {/* Lead Source Breakdown */}
      {stats && stats.sourceBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Lead Source Breakdown</h3>
          <p className="text-[0.6rem] text-slate-500 mb-3">Where your leads are coming from and how they convert</p>
          <div className="space-y-2">
            <div className="grid grid-cols-3 text-[0.6rem] font-medium text-slate-500 uppercase px-1 mb-1">
              <span>Source</span>
              <span className="text-center">Leads</span>
              <span className="text-right">Converted</span>
            </div>
            {stats.sourceBreakdown.slice(0, 8).map((row, i) => {
              const convPct = row.count > 0 ? ((row.converted / row.count) * 100).toFixed(0) : "0";
              const label = row.source === "unknown" ? "Direct / Unknown"
                : row.source.startsWith("/quiz") ? "Broker Quiz"
                : row.source.startsWith("/find-advisor") ? "Find an Advisor"
                : row.source;
              return (
                <div key={i} className="grid grid-cols-3 items-center py-1.5 px-1 rounded-lg hover:bg-slate-50 text-xs">
                  <span className="text-slate-700 font-medium truncate pr-2" title={row.source}>{label}</span>
                  <span className="text-center text-slate-600">{row.count}</span>
                  <span className="text-right text-emerald-600 font-medium">{row.converted} <span className="text-slate-500 font-normal">({convPct}%)</span></span>
                </div>
              );
            })}
          </div>
          {/* Accept rate summary */}
          {stats.totalLeads > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Accept rate (non-rejected)</span>
              <span className="font-semibold text-slate-700">{stats.acceptRate}%</span>
            </div>
          )}
        </div>
      )}

      {/* Peer Benchmarking — "How You Compare" */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-slate-900">How You Compare</h3>
          {benchmarks && benchmarks.cohortSize > 0 && (
            <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              vs {benchmarks.cohortSize} peer{benchmarks.cohortSize !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-[0.6rem] text-slate-500 mb-3">
          Anonymous comparison with advisors of the same type and state. Peer names are never shown.
        </p>

        {benchmarkLoading && (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
            <span aria-hidden="true" className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin shrink-0" />
            Loading peer benchmarks...
          </div>
        )}

        {benchmarkError && (
          <p className="text-xs text-slate-500 py-2">Benchmarks unavailable — check back soon.</p>
        )}

        {!benchmarkLoading && !benchmarkError && benchmarks && benchmarks.cohortSize < 3 && (
          <div className="py-2 space-y-2">
            <p className="text-xs text-slate-500">
              Benchmark unlocks once we have 5+ advisors in your specialty. We&rsquo;ll notify you when it&rsquo;s ready.
            </p>
            {benchmarkNotifyToast ? (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Icon name="check-circle" size={13} className="shrink-0" />
                Got it — we&rsquo;ll let you know when your benchmark is ready.
              </p>
            ) : (
              <button
                onClick={() => setBenchmarkNotifyToast(true)}
                className="text-xs font-semibold px-3 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
              >
                Notify me
              </button>
            )}
          </div>
        )}

        {!benchmarkLoading && !benchmarkError && benchmarks && benchmarks.cohortSize >= 3 && (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 px-0 mb-1">
              <span>Metric</span>
              <span className="text-right">You</span>
              <span className="text-right">Peer avg</span>
              <span className="text-right">Top 25%</span>
            </div>

            <BenchmarkRow
              label="Avg response time"
              yours={benchmarks.yours.avgResponseMinutes}
              peerMedian={benchmarks.peerMedian.avgResponseMinutes}
              peerTop25={benchmarks.peerTop25.avgResponseMinutes}
              format={formatResponseTime}
              lowerIsBetter
            />
            <BenchmarkRow
              label="Accept rate"
              yours={benchmarks.yours.acceptRate}
              peerMedian={benchmarks.peerMedian.acceptRate}
              peerTop25={benchmarks.peerTop25.acceptRate}
              format={(v) => v !== null ? `${v}%` : "—"}
            />
            <BenchmarkRow
              label="Rating"
              yours={benchmarks.yours.rating}
              peerMedian={benchmarks.peerMedian.rating}
              peerTop25={benchmarks.peerTop25.rating}
              format={(v) => v !== null ? v.toFixed(1) : "—"}
            />
            <BenchmarkRow
              label="Reviews"
              yours={benchmarks.yours.reviewCount}
              peerMedian={benchmarks.peerMedian.reviewCount}
              peerTop25={benchmarks.peerTop25.reviewCount}
              format={(v) => v !== null ? String(Math.round(v)) : "—"}
            />

            <p className="text-[0.55rem] text-slate-300 mt-3">
              &ldquo;Top 25%&rdquo; = best-performing quartile of your peer cohort. Benchmarks update nightly.
            </p>
          </>
        )}
      </div>

      {/* Pricing position — where your typical quote sits vs peers */}
      <PricingPositionCard />

      {/* Profile Performance Score */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">Profile Performance Score</h3>
          {profileScore && (
            <span
              className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                profileScore.score >= 80
                  ? "bg-emerald-100 text-emerald-700"
                  : profileScore.score >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {profileScore.score} / {profileScore.maxScore}
            </span>
          )}
        </div>
        <p className="text-[0.6rem] text-slate-500 mb-3">
          A higher score means more trust signals for investors browsing your profile.
        </p>

        {profileScoreLoading && (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
            <span aria-hidden="true" className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin shrink-0" />
            Calculating score…
          </div>
        )}

        {profileScoreError && (
          <p className="text-xs text-slate-500 py-2">Score unavailable — check back soon.</p>
        )}

        {!profileScoreLoading && !profileScoreError && profileScore && (
          <>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  profileScore.score >= 80
                    ? "bg-emerald-500"
                    : profileScore.score >= 50
                      ? "bg-amber-400"
                      : "bg-red-400"
                }`}
                style={{ width: `${profileScore.score}%` }}
              />
            </div>

            {/* Breakdown rows */}
            <div className="space-y-1.5">
              {profileScore.breakdown.map((item, i) => (
                <div key={i} className={`flex items-start gap-2.5 p-2 rounded-lg ${item.earned ? "bg-emerald-50" : "bg-slate-50"}`}>
                  <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[0.55rem] font-bold ${item.earned ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    {item.earned ? "✓" : "–"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-medium ${item.earned ? "text-emerald-800" : "text-slate-700"}`}>
                        {item.label}
                      </span>
                      <span className={`text-[0.6rem] font-bold shrink-0 ${item.earned ? "text-emerald-600" : "text-slate-500"}`}>
                        {item.earned ? `+${item.points}` : `+0/${item.points}`}
                      </span>
                    </div>
                    {!item.earned && (
                      <p className="text-[0.6rem] text-slate-500 mt-0.5 leading-relaxed">{item.tip}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {profileScore.score === 100 && (
              <div className="mt-3 text-center text-emerald-600 text-xs font-semibold py-1.5">
                <Icon name="check-circle" size={14} className="inline mr-1" />
                Perfect score! Your profile is fully optimised.
              </div>
            )}
          </>
        )}
      </div>

      {/* Tips — always rendered; shows next-level growth tips for fully-optimised advisors */}
      {(() => {
        const isFullyOptimised = [
          profileCompleteness?.score === 100,
          advisor?.photo_url && !advisor.photo_url.includes("ui-avatars"),
          advisor?.booking_link,
          (stats?.articles || []).length > 0,
          (advisor?.review_count || 0) > 0,
        ].every(Boolean);

        const improvementTips = [
          profileCompleteness && profileCompleteness.score < 100 ? `Complete your profile (${profileCompleteness.score}%) — complete profiles get 3x more enquiries` : null,
          !advisor?.photo_url?.startsWith("http") || advisor?.photo_url?.includes("ui-avatars") ? "Add a real profile photo — advisors with photos get 2.5x more clicks" : null,
          !advisor?.booking_link ? "Add a booking link — lets investors schedule directly from your profile" : null,
          (stats?.articles || []).length === 0 ? "Publish an expert article — advisors with articles get 40% more profile views" : null,
          advisor?.review_count === 0 ? "Ask a client to leave a review — ratings build trust with new enquiries" : null,
        ].filter(Boolean) as string[];

        const nextLevelTips = [
          "Respond to new leads within 1 hour — fast responders convert at 3× the rate",
          "Request a review after every client engagement to keep your rating climbing",
          "Publish one expert article per month to stay visible in search",
          "Keep your booking link active so investors can schedule without back-and-forth",
        ];

        return (
          <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4 md:p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Icon name="lightbulb" size={16} className="text-amber-500" />
              {isFullyOptimised ? "You're fully optimised — tips to grow further" : "Tips to Improve Performance"}
            </h3>
            {isFullyOptimised && (
              <p className="text-xs text-emerald-700 font-medium mb-3 flex items-center gap-1.5">
                <Icon name="check-circle" size={13} className="shrink-0" />
                Your profile is fully optimised! Here&rsquo;s what moves the needle next:
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
              {(isFullyOptimised ? nextLevelTips : improvementTips).map((tip, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
                  <Icon name="arrow-right" size={12} className="text-violet-500 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import Icon from "@/components/Icon";
import SVGFunnel from "@/components/charts/SVGFunnel";
import SVGBarChart from "@/components/charts/SVGBarChart";
import Link from "next/link";

export interface LeadQualityReport {
  firmId: number;
  totalLeads: number;
  wonCount: number;
  lostCount: number;
  memberCount: number;
  funnel: { stage: string; label: string; count: number; conversionRate: number }[];
  tierBreakdown: { tier: string; count: number; pct: number }[];
  qualityDistribution: { bucket: string; range: string; count: number; pct: number }[];
  topSources: { source: string; count: number }[];
  conversionRate: number | null;
  benchmarks: {
    medianConversionRate: number | null;
    medianLeadsPerMember: number | null;
    topQuartileConversionRate: number | null;
  };
  windowDays: number;
  windowStart: string;
}

const TIER_COLORS: Record<string, string> = {
  standard: "#6366f1",
  qualified: "#8b5cf6",
  exclusive: "#d97706",
};

const QUALITY_COLORS: Record<string, string> = {
  excellent: "#059669",
  good: "#16a34a",
  fair: "#d97706",
  poor: "#dc2626",
  unscored: "#94a3b8",
};

const TIER_LABELS: Record<string, string> = {
  standard: "Standard",
  qualified: "Qualified",
  exclusive: "Exclusive",
};

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "green" | "amber" | "red" }) {
  const bg = highlight === "green" ? "bg-emerald-50 border-emerald-100"
    : highlight === "amber" ? "bg-amber-50 border-amber-100"
    : highlight === "red" ? "bg-red-50 border-red-100"
    : "bg-white border-slate-200";
  const textColor = highlight === "green" ? "text-emerald-700"
    : highlight === "amber" ? "text-amber-700"
    : highlight === "red" ? "text-red-700"
    : "text-slate-900";
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[0.65rem] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BenchmarkLine({
  label,
  yours,
  median,
  top25,
}: {
  label: string;
  yours: number | null;
  median: number | null;
  top25: number | null;
}) {
  const status: "better" | "worse" | "parity" | "unknown" =
    yours === null || median === null ? "unknown" :
    yours > median + 2 ? "better" :
    yours < median - 2 ? "worse" : "parity";

  const chip =
    status === "better" ? <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Above avg</span> :
    status === "worse"  ? <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">Below avg</span> :
    status === "parity" ? <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">At avg</span> :
    <span className="text-[0.6rem] text-slate-500">—</span>;

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center py-2 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-slate-700 font-medium">{label}</span>
      <span className="font-bold text-slate-900 text-right">{yours !== null ? `${yours}%` : "—"}</span>
      <span className="text-slate-500 text-right">{median !== null ? `${median}%` : "—"}{top25 !== null ? ` / ${top25}%` : ""}</span>
      {chip}
    </div>
  );
}

interface Props {
  initial: LeadQualityReport;
}

export default function LeadQualityClient({ initial }: Props) {
  const [report, setReport] = useState<LeadQualityReport>(initial);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/firm-portal/lead-quality");
      if (res.ok) {
        const json = await res.json() as LeadQualityReport;
        setReport(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const { totalLeads, wonCount, lostCount, memberCount, funnel, tierBreakdown, qualityDistribution, topSources, conversionRate, benchmarks, windowDays } = report;

  const funnelStages = funnel
    .filter((s) => s.count > 0 || s.stage === "new")
    .map((s) => ({ label: s.label, value: s.count }));

  const tierBars = tierBreakdown
    .filter((t) => t.count > 0)
    .map((t) => ({ label: TIER_LABELS[t.tier] ?? t.tier, value: t.count, color: TIER_COLORS[t.tier] }));

  const qualityBars = qualityDistribution
    .filter((q) => q.count > 0)
    .map((q) => ({ label: `${q.bucket.charAt(0).toUpperCase() + q.bucket.slice(1)} (${q.range})`, value: q.count, color: QUALITY_COLORS[q.bucket] }));

  const sourceBars = topSources.map((s) => ({ label: s.source, value: s.count }));

  const convHighlight: "green" | "amber" | "red" | undefined =
    conversionRate === null ? undefined :
    conversionRate >= 20 ? "green" :
    conversionRate >= 10 ? "amber" : "red";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lead Quality Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Last {windowDays} days · {memberCount} active {memberCount === 1 ? "member" : "members"}</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="refresh-cw" size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={String(totalLeads)} sub={`Last ${windowDays} days`} />
        <StatCard label="Won" value={String(wonCount)} highlight={wonCount > 0 ? "green" : undefined} />
        <StatCard label="Lost / Dropped" value={String(lostCount)} highlight={lostCount > wonCount && lostCount > 5 ? "amber" : undefined} />
        <StatCard
          label="Conversion Rate"
          value={conversionRate !== null ? `${conversionRate}%` : "—"}
          sub="won ÷ total leads"
          highlight={convHighlight}
        />
      </div>

      {totalLeads === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="inbox" size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No leads recorded in the last {windowDays} days.</p>
          <p className="text-xs text-slate-500 mt-1">
            Leads appear here once advisors receive enquiries.{" "}
            <Link href="/firm-portal/performance" className="text-violet-600 hover:underline">View team performance →</Link>
          </p>
        </div>
      )}

      {totalLeads > 0 && (
        <>
          {/* Conversion Funnel + Benchmarks side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Conversion Funnel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="trending-down" size={16} className="text-violet-600" />
                Pipeline Funnel
              </h2>
              {funnelStages.length > 0 ? (
                <SVGFunnel
                  stages={funnelStages}
                  width={400}
                  stageHeight={48}
                  gap={4}
                />
              ) : (
                <p className="text-xs text-slate-500">No pipeline data available.</p>
              )}
            </div>

            {/* Market Benchmarks */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <Icon name="bar-chart-2" size={16} className="text-violet-600" />
                Market Benchmarks
              </h2>
              <p className="text-[0.65rem] text-slate-500 mb-3">Your results vs market median / top-quartile</p>

              {benchmarks.medianConversionRate === null ? (
                <p className="text-xs text-slate-500">Benchmarks available once enough firms have data.</p>
              ) : (
                <div>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[0.6rem] font-semibold text-slate-500 uppercase tracking-wide pb-1 border-b border-slate-100 mb-1">
                    <span>Metric</span>
                    <span className="text-right">Yours</span>
                    <span className="text-right">Med / Top 25%</span>
                    <span />
                  </div>
                  <BenchmarkLine
                    label="Conversion rate"
                    yours={conversionRate}
                    median={benchmarks.medianConversionRate}
                    top25={benchmarks.topQuartileConversionRate}
                  />
                  <BenchmarkLine
                    label="Leads per member"
                    yours={memberCount > 0 ? +(totalLeads / memberCount).toFixed(1) : null}
                    median={benchmarks.medianLeadsPerMember}
                    top25={null}
                  />
                </div>
              )}

              <p className="text-[0.6rem] text-slate-500 mt-3">
                Benchmarks are anonymised aggregates across all active firms.
              </p>
            </div>
          </div>

          {/* Lead Quality + Tier Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="star" size={16} className="text-violet-600" />
                Quality Score Distribution
              </h2>
              {qualityBars.length > 0 ? (
                <SVGBarChart
                  data={qualityBars}
                  formatValue={(v) => String(v)}
                  width={420}
                  barHeight={26}
                />
              ) : (
                <p className="text-xs text-slate-500">No quality scores available yet.</p>
              )}
              <p className="text-[0.65rem] text-slate-500 mt-3">
                Quality scores are set automatically based on lead completeness and intent signals.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="layers" size={16} className="text-violet-600" />
                Lead Tier Breakdown
              </h2>
              {tierBars.length > 0 ? (
                <>
                  <SVGBarChart
                    data={tierBars}
                    formatValue={(v) => String(v)}
                    width={420}
                    barHeight={26}
                  />
                  <p className="text-[0.65rem] text-slate-500 mt-3">
                    Qualified and Exclusive leads carry higher intent signals and bill at 2× and 3× standard rates.
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500">No tier data available yet.</p>
              )}
            </div>
          </div>

          {/* Top Lead Sources */}
          {sourceBars.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="link" size={16} className="text-violet-600" />
                Top Lead Sources (UTM)
              </h2>
              <SVGBarChart
                data={sourceBars}
                formatValue={(v) => String(v)}
                color="#7c3aed"
                width={600}
                barHeight={26}
              />
              <p className="text-[0.65rem] text-slate-500 mt-3">
                Source derived from utm_source on inbound enquiries. &ldquo;(direct)&rdquo; = no UTM parameter.
              </p>
            </div>
          )}
        </>
      )}

      {/* Nav links */}
      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/firm-portal/performance" className="text-violet-600 hover:underline flex items-center gap-1">
          <Icon name="users" size={12} />
          Team performance
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/advisor-portal?tab=leads" className="text-violet-600 hover:underline flex items-center gap-1">
          <Icon name="inbox" size={12} />
          Lead inbox
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/firm-portal/billing" className="text-violet-600 hover:underline flex items-center gap-1">
          <Icon name="credit-card" size={12} />
          Billing
        </Link>
      </div>
    </div>
  );
}

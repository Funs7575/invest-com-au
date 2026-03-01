"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

type DateRange = "7d" | "30d" | "90d";

interface AllocationDecision {
  id: number;
  created_at: string;
  placement_slug: string;
  candidates: any[];
  winners: any[];
  rejection_log: any[];
  fallback_used: boolean;
  duration_ms: number;
}

const PAGE_SIZE = 25;

export default function AllocationDecisionsPage() {
  const [decisions, setDecisions] = useState<AllocationDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [placementFilter, setPlacementFilter] = useState<string>("all");
  const [placements, setPlacements] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // KPI state
  const [kpiTotal, setKpiTotal] = useState(0);
  const [kpiWithWinners, setKpiWithWinners] = useState(0);
  const [kpiFallback, setKpiFallback] = useState(0);
  const [kpiAvgDuration, setKpiAvgDuration] = useState(0);

  const getDateFilter = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case "7d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d.toISOString();
      }
      case "30d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return d.toISOString();
      }
      case "90d": {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        return d.toISOString();
      }
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [dateRange, placementFilter, page]);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    const dateFrom = getDateFilter();

    // Build count query for KPIs (all matching records, not paginated)
    let kpiQuery = supabase
      .from("allocation_decisions")
      .select("id, winners, fallback_used, duration_ms", { count: "exact" });
    if (dateFrom) kpiQuery = kpiQuery.gte("created_at", dateFrom);
    if (placementFilter !== "all") kpiQuery = kpiQuery.eq("placement_slug", placementFilter);

    const { data: kpiData, count: kpiCount } = await kpiQuery;

    if (kpiData) {
      setKpiTotal(kpiCount || 0);
      setKpiWithWinners(kpiData.filter((d: any) => d.winners && d.winners.length > 0).length);
      setKpiFallback(kpiData.filter((d: any) => d.fallback_used).length);
      const durations = kpiData.map((d: any) => d.duration_ms || 0).filter((d: number) => d > 0);
      setKpiAvgDuration(
        durations.length > 0
          ? Math.round(durations.reduce((s: number, v: number) => s + v, 0) / durations.length)
          : 0
      );
    }

    // Build paginated data query
    let dataQuery = supabase
      .from("allocation_decisions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (dateFrom) dataQuery = dataQuery.gte("created_at", dateFrom);
    if (placementFilter !== "all") dataQuery = dataQuery.eq("placement_slug", placementFilter);

    const { data, count } = await dataQuery;

    if (data) {
      setDecisions(data as AllocationDecision[]);
      setTotalCount(count || 0);
    }

    // Load unique placement slugs for the filter dropdown
    const { data: placementData } = await supabase
      .from("allocation_decisions")
      .select("placement_slug")
      .order("placement_slug");

    if (placementData) {
      const unique = Array.from(new Set(placementData.map((p: any) => p.placement_slug))).filter(Boolean) as string[];
      setPlacements(unique);
    }

    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getWinnerSlugs = (winners: any[]): string => {
    if (!winners || winners.length === 0) return "\u2014";
    return winners.map((w: any) => (typeof w === "string" ? w : w.broker_slug || w.slug || "unknown")).join(", ");
  };

  const SkeletonCard = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
      <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-24 bg-slate-200 rounded" />
    </div>
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Allocation Decision Log</h1>
          <p className="text-sm text-slate-500">
            Campaign approval queue — review and approve or reject pending campaigns.
          </p>
        </div>

        {/* Date Range + Placement Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Range:</span>
            {(["7d", "30d", "90d"] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setPage(0);
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  dateRange === range
                    ? "bg-amber-500 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Placement:</span>
            <select
              value={placementFilter}
              onChange={(e) => {
                setPlacementFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="all">All Placements</option>
              {placements.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-slate-900">{kpiTotal.toLocaleString()}</div>
                <div className="text-sm text-slate-500">Total Decisions</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-emerald-600">{kpiWithWinners.toLocaleString()}</div>
                <div className="text-sm text-slate-500">With Winners</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-amber-600">{kpiFallback.toLocaleString()}</div>
                <div className="text-sm text-slate-500">Fallback Used</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600">{kpiAvgDuration}ms</div>
                <div className="text-sm text-slate-500">Avg Duration</div>
              </div>
            </>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Decision Log</h2>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-500">
                Page {page + 1}
                {totalPages > 0 ? ` of ${totalPages}` : ""}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={decisions.length < PAGE_SIZE}
                className="px-3 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : decisions.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No allocation decisions found for this filter.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Timestamp
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Placement
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Candidates
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Winners
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Rejections
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">
                      Fallback
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {decisions.map((d) => {
                    const isExpanded = expandedRow === d.id;
                    const candidateCount = d.candidates?.length || 0;
                    const rejectionCount = d.rejection_log?.length || 0;

                    return (
                      <Fragment key={d.id}>
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : d.id)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <svg
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              {formatTimestamp(d.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-sm">
                            <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">
                              {d.placement_slug}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                            {candidateCount}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-900 font-medium">
                            {getWinnerSlugs(d.winners)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right">
                            <span
                              className={
                                rejectionCount > 0
                                  ? "text-red-600 font-medium"
                                  : "text-slate-400"
                              }
                            >
                              {rejectionCount}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-center">
                            {d.fallback_used ? (
                              <span className="inline-block w-5 h-5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold leading-5">
                                Y
                              </span>
                            ) : (
                              <span className="inline-block w-5 h-5 bg-slate-100 text-slate-400 rounded-full text-xs leading-5">
                                N
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-right text-slate-600">
                            {d.duration_ms != null ? `${d.duration_ms}ms` : "\u2014"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50 px-6 py-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                    Candidates ({candidateCount})
                                  </h4>
                                  <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-64">
                                    {JSON.stringify(d.candidates, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                    Winners ({d.winners?.length || 0})
                                  </h4>
                                  <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-64">
                                    {JSON.stringify(d.winners, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                    Rejection Log ({rejectionCount})
                                  </h4>
                                  <pre className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-64">
                                    {JSON.stringify(d.rejection_log, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}


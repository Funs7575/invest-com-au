"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

/**
 * /admin/analytics/funnel — Conversion funnel dashboard.
 *
 * Six numbers, 7-day trends, one page. Answers the question
 * "is the site converting, and where do people drop off?"
 *
 * Metrics:
 *   1. Unique visitors (distinct sessions in analytics_events)
 *   2. Quiz starts (event_type = 'quiz_start')
 *   3. Quiz completions (event_type IN ('quiz_complete','quiz_completed'))
 *   4. Newsletter signups (newsletter_subscriptions rows)
 *   5. Advisor requests (professional_leads rows)
 *   6. Affiliate click-outs (affiliate_clicks rows)
 *
 * Each metric shows: this week's count, last week's count,
 * % change, and a tiny sparkline-style bar chart of daily values.
 */

interface FunnelMetric {
  label: string;
  thisWeek: number;
  lastWeek: number;
  daily: number[]; // 7 values, index 0 = 6 days ago, index 6 = today
}

interface RawDailyRow {
  day: string;
  cnt: number;
}

export default function FunnelDashboard() {
  const [metrics, setMetrics] = useState<FunnelMetric[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
        .toISOString()
        .slice(0, 10);

      // Helper to count events by type in a date range
      async function countEvents(
        eventTypes: string[],
        from: string,
        to: string,
      ): Promise<number> {
        const { count } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .in("event_type", eventTypes)
          .gte("created_at", from)
          .lte("created_at", to + "T23:59:59Z");
        return count ?? 0;
      }

      // Helper to count rows in a table by date range
      async function countRows(
        table: string,
        from: string,
        to: string,
      ): Promise<number> {
        const { count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .gte("created_at", from)
          .lte("created_at", to + "T23:59:59Z");
        return count ?? 0;
      }

      // Helper to get daily breakdown of events
      async function dailyEvents(
        eventTypes: string[],
        from: string,
      ): Promise<number[]> {
        const { data } = await supabase
          .from("analytics_events")
          .select("created_at")
          .in("event_type", eventTypes)
          .gte("created_at", from);
        return toDailyArray(data || [], from);
      }

      // Helper to get daily breakdown from a table
      async function dailyRows(
        table: string,
        from: string,
      ): Promise<number[]> {
        const { data } = await supabase
          .from(table)
          .select("created_at")
          .gte("created_at", from);
        return toDailyArray(data || [], from);
      }

      function toDailyArray(
        rows: Array<{ created_at: string }>,
        from: string,
      ): number[] {
        const counts = new Array(7).fill(0);
        const fromDate = new Date(from);
        for (const row of rows) {
          const d = new Date(row.created_at);
          const dayIndex = Math.floor(
            (d.getTime() - fromDate.getTime()) / 86400000,
          );
          if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex]++;
        }
        return counts;
      }

      // Unique sessions (distinct session_id)
      const { data: sessionData } = await supabase
        .from("analytics_events")
        .select("session_id, created_at")
        .gte("created_at", sevenDaysAgo);
      const uniqueSessions = new Set(
        (sessionData || []).map((r) => r.session_id).filter(Boolean),
      ).size;

      const { data: prevSessionData } = await supabase
        .from("analytics_events")
        .select("session_id")
        .gte("created_at", fourteenDaysAgo)
        .lt("created_at", sevenDaysAgo);
      const prevUniqueSessions = new Set(
        (prevSessionData || []).map((r) => r.session_id).filter(Boolean),
      ).size;

      // Daily sessions for sparkline
      const sessionDaily = (() => {
        const counts = new Array(7).fill(0);
        const fromDate = new Date(sevenDaysAgo);
        const byDay = new Map<number, Set<string>>();
        for (const row of sessionData || []) {
          if (!row.session_id) continue;
          const d = new Date(row.created_at);
          const idx = Math.floor(
            (d.getTime() - fromDate.getTime()) / 86400000,
          );
          if (idx >= 0 && idx < 7) {
            if (!byDay.has(idx)) byDay.set(idx, new Set());
            byDay.get(idx)!.add(row.session_id);
          }
        }
        for (const [idx, set] of byDay) counts[idx] = set.size;
        return counts;
      })();

      // Parallel fetches for the other 5 metrics
      const [
        quizStartsThisWeek,
        quizStartsLastWeek,
        quizStartsDaily,
        quizCompletesThisWeek,
        quizCompletesLastWeek,
        quizCompletesDaily,
        newsletterThisWeek,
        newsletterLastWeek,
        newsletterDaily,
        advisorThisWeek,
        advisorLastWeek,
        advisorDaily,
        clicksThisWeek,
        clicksLastWeek,
        clicksDaily,
      ] = await Promise.all([
        countEvents(["quiz_start"], sevenDaysAgo, todayIso),
        countEvents(["quiz_start"], fourteenDaysAgo, sevenDaysAgo),
        dailyEvents(["quiz_start"], sevenDaysAgo),
        countEvents(
          ["quiz_complete", "quiz_completed"],
          sevenDaysAgo,
          todayIso,
        ),
        countEvents(
          ["quiz_complete", "quiz_completed"],
          fourteenDaysAgo,
          sevenDaysAgo,
        ),
        dailyEvents(["quiz_complete", "quiz_completed"], sevenDaysAgo),
        countRows("newsletter_subscriptions", sevenDaysAgo, todayIso),
        countRows("newsletter_subscriptions", fourteenDaysAgo, sevenDaysAgo),
        dailyRows("newsletter_subscriptions", sevenDaysAgo),
        countRows("professional_leads", sevenDaysAgo, todayIso),
        countRows("professional_leads", fourteenDaysAgo, sevenDaysAgo),
        dailyRows("professional_leads", sevenDaysAgo),
        countRows("affiliate_clicks", sevenDaysAgo, todayIso),
        countRows("affiliate_clicks", fourteenDaysAgo, sevenDaysAgo),
        dailyRows("affiliate_clicks", sevenDaysAgo),
      ]);

      setMetrics([
        {
          label: "Unique visitors",
          thisWeek: uniqueSessions,
          lastWeek: prevUniqueSessions,
          daily: sessionDaily,
        },
        {
          label: "Quiz starts",
          thisWeek: quizStartsThisWeek,
          lastWeek: quizStartsLastWeek,
          daily: quizStartsDaily,
        },
        {
          label: "Quiz completions",
          thisWeek: quizCompletesThisWeek,
          lastWeek: quizCompletesLastWeek,
          daily: quizCompletesDaily,
        },
        {
          label: "Newsletter signups",
          thisWeek: newsletterThisWeek,
          lastWeek: newsletterLastWeek,
          daily: newsletterDaily,
        },
        {
          label: "Advisor requests",
          thisWeek: advisorThisWeek,
          lastWeek: advisorLastWeek,
          daily: advisorDaily,
        },
        {
          label: "Affiliate click-outs",
          thisWeek: clicksThisWeek,
          lastWeek: clicksLastWeek,
          daily: clicksDaily,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="Conversion Funnel"
      subtitle="7-day snapshot — where visitors come from and where they convert"
    >
      <div className="p-6 max-w-6xl mx-auto">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 bg-white border border-slate-200 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : metrics ? (
          <>
            {/* Funnel cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {metrics.map((m, i) => (
                <FunnelCard key={m.label} metric={m} step={i + 1} />
              ))}
            </div>

            {/* Conversion rates */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                Conversion rates (this week)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ConversionRate
                  label="Quiz start rate"
                  numerator={metrics[1].thisWeek}
                  denominator={metrics[0].thisWeek}
                />
                <ConversionRate
                  label="Quiz completion rate"
                  numerator={metrics[2].thisWeek}
                  denominator={metrics[1].thisWeek}
                />
                <ConversionRate
                  label="Advisor request rate"
                  numerator={metrics[4].thisWeek}
                  denominator={metrics[0].thisWeek}
                />
                <ConversionRate
                  label="Click-out rate"
                  numerator={metrics[5].thisWeek}
                  denominator={metrics[0].thisWeek}
                />
              </div>
            </div>

            {/* Funnel visualization */}
            <div className="mt-8 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                Funnel shape
              </h3>
              <div className="space-y-2">
                {metrics.map((m) => {
                  const maxVal = Math.max(
                    ...metrics.map((x) => x.thisWeek),
                    1,
                  );
                  const pct = Math.max(
                    (m.thisWeek / maxVal) * 100,
                    m.thisWeek > 0 ? 3 : 0,
                  );
                  return (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="w-36 text-xs font-semibold text-slate-600 text-right shrink-0">
                        {m.label}
                      </span>
                      <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${pct}%` }}
                        >
                          {pct > 10 && (
                            <span className="text-[10px] font-bold text-white">
                              {m.thisWeek}
                            </span>
                          )}
                        </div>
                      </div>
                      {pct <= 10 && (
                        <span className="text-[10px] font-bold text-slate-500 w-8">
                          {m.thisWeek}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

function FunnelCard({
  metric,
  step,
}: {
  metric: FunnelMetric;
  step: number;
}) {
  const change =
    metric.lastWeek > 0
      ? ((metric.thisWeek - metric.lastWeek) / metric.lastWeek) * 100
      : metric.thisWeek > 0
        ? 100
        : 0;
  const changeColor =
    change > 0
      ? "text-emerald-700"
      : change < 0
        ? "text-red-700"
        : "text-slate-500";
  const changeSign = change > 0 ? "+" : "";
  const maxDaily = Math.max(...metric.daily, 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold flex items-center justify-center">
            {step}
          </span>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {metric.label}
          </span>
        </div>
        <span className={`text-[11px] font-bold ${changeColor}`}>
          {changeSign}
          {change.toFixed(0)}% vs last wk
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold text-slate-900">
          {metric.thisWeek.toLocaleString()}
        </span>
        <span className="text-sm text-slate-500">
          (was {metric.lastWeek.toLocaleString()})
        </span>
      </div>

      {/* Mini sparkline bar chart */}
      <div className="flex items-end gap-[3px] h-8 mt-auto">
        {metric.daily.map((val, i) => {
          const h = Math.max((val / maxDaily) * 100, val > 0 ? 8 : 2);
          return (
            <div
              key={i}
              className="flex-1 rounded-sm bg-amber-400"
              style={{ height: `${h}%` }}
              title={`Day ${i + 1}: ${val}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-slate-400">7 days ago</span>
        <span className="text-[9px] text-slate-400">today</span>
      </div>
    </div>
  );
}

function ConversionRate({
  label,
  numerator,
  denominator,
}: {
  label: string;
  numerator: number;
  denominator: number;
}) {
  const rate = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const color =
    rate > 10 ? "text-emerald-700" : rate > 3 ? "text-amber-700" : "text-red-700";

  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-xl font-extrabold ${color}`}>
        {rate.toFixed(1)}%
      </p>
      <p className="text-[10px] text-slate-400">
        {numerator} / {denominator}
      </p>
    </div>
  );
}

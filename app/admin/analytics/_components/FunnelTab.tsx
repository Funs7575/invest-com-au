"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SVGFunnel from "@/components/charts/SVGFunnel";
import FunnelChart from "@/app/admin/_components/FunnelChart";

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelTabProps {
  loading: boolean;
  funnelData: FunnelStage[];
}

interface FunnelCounts {
  advisor_directory_view: number;
  advisor_profile_view: number;
  advisor_enquiry_submitted: number;
  advisor_review_submitted: number;
  advisor_signup_started: number;
  advisor_signup_completed: number;
  // Broker funnel
  compare_select: number;
  affiliate_click: number;
  deal_claimed: number;
  quiz_start: number;
  quiz_completed: number;
  // Page views (estimated from analytics_events)
  page_views: number;
}

const FUNNEL_EVENT_TYPES = [
  'advisor_directory_view',
  'advisor_profile_view',
  'advisor_enquiry_submitted',
  'advisor_review_submitted',
  'advisor_signup_started',
  'advisor_signup_completed',
  'compare_select',
  'affiliate_click',
  'deal_claimed',
  'quiz_start',
  'quiz_completed',
  'quiz_complete',
  'outbound_click',
];

export default function FunnelTab({ loading: parentLoading, funnelData }: FunnelTabProps) {
  const [funnelCounts, setFunnelCounts] = useState<FunnelCounts | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    async function loadFunnelData() {
      setFunnelLoading(true);
      const supabase = createClient();

      // Calculate date filter
      let dateFrom: string | null = null;
      const now = new Date();
      switch (dateRange) {
        case "7d": { const d = new Date(now); d.setDate(d.getDate() - 7); dateFrom = d.toISOString(); break; }
        case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); dateFrom = d.toISOString(); break; }
        case "90d": { const d = new Date(now); d.setDate(d.getDate() - 90); dateFrom = d.toISOString(); break; }
      }

      // Fetch counts for each funnel event type
      const counts: Record<string, number> = {};

      const promises = FUNNEL_EVENT_TYPES.map(async (eventType) => {
        let query = supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", eventType);
        if (dateFrom) query = query.gte("created_at", dateFrom);
        const { count } = await query;
        counts[eventType] = count || 0;
      });

      // Also get affiliate_clicks count from the dedicated table
      const affiliateClicksPromise = (async () => {
        let query = supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true });
        if (dateFrom) query = query.gte("clicked_at", dateFrom);
        const { count } = await query;
        counts._affiliate_clicks_table = count || 0;
      })();

      // Get total page views estimate
      const pageViewsPromise = (async () => {
        let query = supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true });
        if (dateFrom) query = query.gte("created_at", dateFrom);
        const { count } = await query;
        counts._total_events = count || 0;
      })();

      await Promise.all([...promises, affiliateClicksPromise, pageViewsPromise]);

      // Use the higher of analytics_events affiliate_click or affiliate_clicks table
      const totalAffiliateClicks = Math.max(
        counts.affiliate_click || 0,
        counts._affiliate_clicks_table || 0
      );

      // Combine quiz_complete + quiz_completed (legacy + new event name)
      const totalQuizCompleted = (counts.quiz_completed || 0) + (counts.quiz_complete || 0);

      setFunnelCounts({
        advisor_directory_view: counts.advisor_directory_view || 0,
        advisor_profile_view: counts.advisor_profile_view || 0,
        advisor_enquiry_submitted: counts.advisor_enquiry_submitted || 0,
        advisor_review_submitted: counts.advisor_review_submitted || 0,
        advisor_signup_started: counts.advisor_signup_started || 0,
        advisor_signup_completed: counts.advisor_signup_completed || 0,
        compare_select: counts.compare_select || 0,
        affiliate_click: totalAffiliateClicks,
        deal_claimed: counts.deal_claimed || 0,
        quiz_start: counts.quiz_start || 0,
        quiz_completed: totalQuizCompleted,
        page_views: counts._total_events || 0,
      });

      setFunnelLoading(false);
    }

    loadFunnelData();
  }, [dateRange]);

  const loading = parentLoading || funnelLoading;

  // Build advisor funnel stages
  const advisorFunnel: FunnelStage[] = funnelCounts ? [
    { label: "Directory Views", value: funnelCounts.advisor_directory_view, color: "#7c3aed" },
    { label: "Profile Views", value: funnelCounts.advisor_profile_view, color: "#8b5cf6" },
    { label: "Enquiries Sent", value: funnelCounts.advisor_enquiry_submitted, color: "#a78bfa" },
    { label: "Reviews Left", value: funnelCounts.advisor_review_submitted, color: "#c4b5fd" },
  ].filter(s => s.value > 0) : [];

  // Build advisor signup funnel
  const advisorSignupFunnel: FunnelStage[] = funnelCounts ? [
    { label: "Signup Started", value: funnelCounts.advisor_signup_started, color: "#0ea5e9" },
    { label: "Signup Completed", value: funnelCounts.advisor_signup_completed, color: "#06b6d4" },
  ].filter(s => s.value > 0) : [];

  // Build broker funnel stages
  const brokerFunnel: FunnelStage[] = funnelCounts ? [
    { label: "Compare Selections", value: funnelCounts.compare_select, color: "#16a34a" },
    { label: "Affiliate Clicks", value: funnelCounts.affiliate_click, color: "#22c55e" },
    { label: "Deals Claimed", value: funnelCounts.deal_claimed, color: "#65a30d" },
  ].filter(s => s.value > 0) : [];

  // Build quiz funnel
  const quizFunnel: FunnelStage[] = funnelCounts ? [
    { label: "Quiz Started", value: funnelCounts.quiz_start, color: "#d97706" },
    { label: "Quiz Completed", value: funnelCounts.quiz_completed, color: "#f59e0b" },
  ].filter(s => s.value > 0) : [];

  // Summary metrics
  const advisorConvRate = funnelCounts && funnelCounts.advisor_directory_view > 0
    ? ((funnelCounts.advisor_enquiry_submitted / funnelCounts.advisor_directory_view) * 100).toFixed(2)
    : "0.00";
  const brokerConvRate = funnelCounts && funnelCounts.compare_select > 0
    ? ((funnelCounts.affiliate_click / funnelCounts.compare_select) * 100).toFixed(2)
    : "0.00";
  const quizConvRate = funnelCounts && funnelCounts.quiz_start > 0
    ? ((funnelCounts.quiz_completed / funnelCounts.quiz_start) * 100).toFixed(2)
    : "0.00";
  const signupConvRate = funnelCounts && funnelCounts.advisor_signup_started > 0
    ? ((funnelCounts.advisor_signup_completed / funnelCounts.advisor_signup_started) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Funnel Period:</span>
        {(["7d", "30d", "90d", "all"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              dateRange === range
                ? "bg-violet-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {range === "all" ? "All Time" : range}
          </button>
        ))}
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-violet-600">{advisorConvRate}%</div>
          <div className="text-xs text-slate-500">Advisor Directory-to-Enquiry</div>
          <div className="text-[0.62rem] text-slate-400 mt-1">
            {funnelCounts?.advisor_directory_view.toLocaleString() || 0} views / {funnelCounts?.advisor_enquiry_submitted.toLocaleString() || 0} enquiries
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-emerald-600">{brokerConvRate}%</div>
          <div className="text-xs text-slate-500">Compare-to-Affiliate Click</div>
          <div className="text-[0.62rem] text-slate-400 mt-1">
            {funnelCounts?.compare_select.toLocaleString() || 0} selections / {funnelCounts?.affiliate_click.toLocaleString() || 0} clicks
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{quizConvRate}%</div>
          <div className="text-xs text-slate-500">Quiz Start-to-Complete</div>
          <div className="text-[0.62rem] text-slate-400 mt-1">
            {funnelCounts?.quiz_start.toLocaleString() || 0} started / {funnelCounts?.quiz_completed.toLocaleString() || 0} completed
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-cyan-600">{signupConvRate}%</div>
          <div className="text-xs text-slate-500">Advisor Signup Conversion</div>
          <div className="text-[0.62rem] text-slate-400 mt-1">
            {funnelCounts?.advisor_signup_started.toLocaleString() || 0} started / {funnelCounts?.advisor_signup_completed.toLocaleString() || 0} completed
          </div>
        </div>
      </div>

      {/* Advisor Conversion Funnel */}
      <FunnelChart
        title="Advisor Conversion Funnel"
        description="Directory views through to enquiry submissions and reviews"
        stages={advisorFunnel}
        loading={loading}
      />

      {/* Broker Conversion Funnel */}
      <FunnelChart
        title="Broker Conversion Funnel"
        description="Compare page selections through to affiliate clicks and deal claims"
        stages={brokerFunnel}
        loading={loading}
      />

      {/* Two-column: Quiz + Advisor Signup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart
          title="Quiz Funnel"
          description="Quiz start to completion rate"
          stages={quizFunnel}
          loading={loading}
        />
        <FunnelChart
          title="Advisor Signup Funnel"
          description="Signup page visits to account creation"
          stages={advisorSignupFunnel}
          loading={loading}
        />
      </div>

      {/* Legacy overall funnel (SVG) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Overall Site Funnel</h2>
          <p className="text-xs text-slate-500">Estimated end-to-end user journey from homepage to signup.</p>
        </div>
        {parentLoading ? (
          <div className="p-8 animate-pulse h-60 bg-slate-100" />
        ) : (
          <div className="p-6">
            <SVGFunnel
              stages={funnelData}
              width={520}
              stageHeight={56}
              gap={6}
            />
          </div>
        )}
      </div>

      {/* Stage-by-stage breakdown table for advisor funnel */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Advisor Funnel Breakdown</h2>
        </div>
        {!loading && funnelCounts && (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stage</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Count</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Step Conv.</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Overall Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { label: "Directory Views", value: funnelCounts.advisor_directory_view },
                { label: "Profile Views", value: funnelCounts.advisor_profile_view },
                { label: "Enquiries Submitted", value: funnelCounts.advisor_enquiry_submitted },
                { label: "Reviews Submitted", value: funnelCounts.advisor_review_submitted },
              ].map((stage, i, arr) => {
                const total = arr[0]?.value || 1;
                const prev = i > 0 ? arr[i - 1].value : stage.value;
                const stepConv = i > 0 && prev > 0 ? ((stage.value / prev) * 100).toFixed(1) : "---";
                const overallConv = ((stage.value / total) * 100).toFixed(1);
                return (
                  <tr key={stage.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{stage.label}</td>
                    <td className="px-4 py-3 text-sm text-right text-violet-600 font-semibold">{stage.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {i > 0 ? (
                        <span className="text-emerald-600 font-semibold">{stepConv}%</span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{overallConv}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stage-by-stage breakdown table for broker funnel */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Broker Funnel Breakdown</h2>
        </div>
        {!loading && funnelCounts && (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Stage</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Count</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Step Conv.</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Overall Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { label: "Compare Selections", value: funnelCounts.compare_select },
                { label: "Affiliate Clicks", value: funnelCounts.affiliate_click },
                { label: "Deals Claimed", value: funnelCounts.deal_claimed },
              ].map((stage, i, arr) => {
                const total = arr[0]?.value || 1;
                const prev = i > 0 ? arr[i - 1].value : stage.value;
                const stepConv = i > 0 && prev > 0 ? ((stage.value / prev) * 100).toFixed(1) : "---";
                const overallConv = ((stage.value / total) * 100).toFixed(1);
                return (
                  <tr key={stage.label} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{stage.label}</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600 font-semibold">{stage.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {i > 0 ? (
                        <span className="text-emerald-600 font-semibold">{stepConv}%</span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{overallConv}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

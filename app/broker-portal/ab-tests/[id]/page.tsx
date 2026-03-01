"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import CountUp from "@/components/CountUp";
import type { ABTest } from "@/lib/types";

const TEST_TYPES: Record<string, string> = {
  cta_text: "CTA Text",
  deal_text: "Deal Text",
  banner: "Banner Image",
  landing_page: "Landing Page URL",
};

const STATUS_STYLES: Record<string, { bg: string; icon: string }> = {
  draft: { bg: "bg-slate-100 text-slate-700", icon: "file-text" },
  running: { bg: "bg-emerald-100 text-emerald-800", icon: "trending-up" },
  paused: { bg: "bg-amber-100 text-amber-800", icon: "pause-circle" },
  completed: { bg: "bg-blue-100 text-blue-800", icon: "check-circle" },
};

/* ── Statistical helpers ── */

/** Two-proportion Z-test */
function computeZScore(
  successA: number,
  trialsA: number,
  successB: number,
  trialsB: number
): { z: number; pValue: number; confidence: number } {
  if (trialsA === 0 || trialsB === 0) return { z: 0, pValue: 1, confidence: 0 };

  const p1 = successA / trialsA;
  const p2 = successB / trialsB;
  const pPooled = (successA + successB) / (trialsA + trialsB);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / trialsA + 1 / trialsB));

  if (se === 0) return { z: 0, pValue: 1, confidence: 0 };

  const z = (p1 - p2) / se;

  // Approximate two-tailed p-value using the normal CDF
  const absZ = Math.abs(z);
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989422804014327; // 1/sqrt(2*PI)
  const prob =
    d *
    Math.exp((-absZ * absZ) / 2) *
    (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
  const pValue = 2 * prob;
  const confidence = (1 - pValue) * 100;

  return { z, pValue, confidence };
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 95) return { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" };
  if (confidence >= 80) return { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" };
  return { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", dot: "bg-red-500" };
}

/* ── SVG Comparison Bar Chart ── */

function ComparisonBarChart({ test }: { test: ABTest }) {
  const ctrA = test.impressions_a > 0 ? (test.clicks_a / test.impressions_a) * 100 : 0;
  const ctrB = test.impressions_b > 0 ? (test.clicks_b / test.impressions_b) * 100 : 0;
  const convRateA = test.clicks_a > 0 ? (test.conversions_a / test.clicks_a) * 100 : 0;
  const convRateB = test.clicks_b > 0 ? (test.conversions_b / test.clicks_b) * 100 : 0;

  const metrics = [
    { label: "Impressions", a: test.impressions_a, b: test.impressions_b, suffix: "" },
    { label: "Clicks", a: test.clicks_a, b: test.clicks_b, suffix: "" },
    { label: "CTR", a: ctrA, b: ctrB, suffix: "%" },
    { label: "Conversions", a: test.conversions_a, b: test.conversions_b, suffix: "" },
    { label: "Conv Rate", a: convRateA, b: convRateB, suffix: "%" },
  ];

  const svgWidth = 480;
  const barHeight = 18;
  const rowHeight = 52;
  const labelWidth = 90;
  const chartWidth = svgWidth - labelWidth - 10;
  const svgHeight = metrics.length * rowHeight + 30;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
      aria-label="Performance comparison chart"
    >
      {/* Legend */}
      <rect x={labelWidth} y={4} width={12} height={12} rx={2} fill="#3b82f6" />
      <text x={labelWidth + 18} y={14} fontSize={11} fill="#475569" fontWeight={600}>Variant A</text>
      <rect x={labelWidth + 100} y={4} width={12} height={12} rx={2} fill="#f59e0b" />
      <text x={labelWidth + 118} y={14} fontSize={11} fill="#475569" fontWeight={600}>Variant B</text>

      {metrics.map((m, i) => {
        const y = i * rowHeight + 30;
        const maxVal = Math.max(m.a, m.b) || 1;
        const widthA = (m.a / maxVal) * chartWidth * 0.9;
        const widthB = (m.b / maxVal) * chartWidth * 0.9;
        const formatVal = (v: number) => m.suffix === "%" ? v.toFixed(2) + "%" : v.toLocaleString();

        return (
          <g key={m.label}>
            <text x={0} y={y + 14} fontSize={11} fill="#64748b" fontWeight={600}>
              {m.label}
            </text>
            {/* Bar A */}
            <rect x={labelWidth} y={y + 2} width={Math.max(widthA, 2)} height={barHeight} rx={4} fill="#3b82f6" opacity={0.85}>
              <animate attributeName="width" from="0" to={Math.max(widthA, 2)} dur="0.6s" fill="freeze" />
            </rect>
            <text x={labelWidth + Math.max(widthA, 2) + 6} y={y + 16} fontSize={10} fill="#334155" fontWeight={700}>
              {formatVal(m.a)}
            </text>
            {/* Bar B */}
            <rect x={labelWidth} y={y + barHeight + 6} width={Math.max(widthB, 2)} height={barHeight} rx={4} fill="#f59e0b" opacity={0.85}>
              <animate attributeName="width" from="0" to={Math.max(widthB, 2)} dur="0.6s" fill="freeze" />
            </rect>
            <text x={labelWidth + Math.max(widthB, 2) + 6} y={y + barHeight + 20} fontSize={10} fill="#334155" fontWeight={700}>
              {formatVal(m.b)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ABTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [test, setTest] = useState<ABTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [brokerSlug, setBrokerSlug] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      setBrokerSlug(account.broker_slug);

      const { data } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("id", params.id)
        .eq("broker_slug", account.broker_slug)
        .maybeSingle();

      if (data) setTest(data as ABTest);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const handleApplyWinner = async () => {
    if (!test || !test.winner) return;
    toast(`Variant ${test.winner.toUpperCase()} applied as default`, "success");
  };

  const handleRerun = async () => {
    if (!test) return;
    const supabase = createClient();
    const { error } = await supabase.from("ab_tests").insert({
      broker_slug: brokerSlug,
      name: `${test.name} (Re-run)`,
      type: test.type,
      status: "draft",
      variant_a: test.variant_a,
      variant_b: test.variant_b,
      traffic_split: test.traffic_split,
    });

    if (error) {
      toast("Failed to create re-run", "error");
    } else {
      toast("New test created from this config", "success");
      router.push("/broker-portal/ab-tests");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-16">
        <Icon name="alert-circle" size={32} className="text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium mb-2">Test not found</p>
        <Link href="/broker-portal/ab-tests" className="text-sm text-slate-500 hover:text-slate-700 underline">
          Back to all tests
        </Link>
      </div>
    );
  }

  // Compute metrics
  const ctrA = test.impressions_a > 0 ? (test.clicks_a / test.impressions_a) * 100 : 0;
  const ctrB = test.impressions_b > 0 ? (test.clicks_b / test.impressions_b) * 100 : 0;
  const convRateA = test.clicks_a > 0 ? (test.conversions_a / test.clicks_a) * 100 : 0;
  const convRateB = test.clicks_b > 0 ? (test.conversions_b / test.clicks_b) * 100 : 0;

  // CTR difference percentages
  const ctrDiff = ctrA > 0 ? ((ctrB - ctrA) / ctrA) * 100 : ctrB > 0 ? 100 : 0;
  const convDiff = convRateA > 0 ? ((convRateB - convRateA) / convRateA) * 100 : convRateB > 0 ? 100 : 0;

  // Statistical significance (Z-test on CTR)
  const stats = computeZScore(test.clicks_a, test.impressions_a, test.clicks_b, test.impressions_b);
  const confColor = getConfidenceColor(stats.confidence);
  const betterVariant = ctrB > ctrA ? "B" : ctrA > ctrB ? "A" : null;

  const totalImpressions = test.impressions_a + test.impressions_b;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/broker-portal/ab-tests"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Icon name="arrow-left" size={14} />
        Back to all tests
      </Link>

      {/* Hero Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6" style={{ animation: "resultCardIn 0.3s ease-out" }}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{test.name}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[test.status]?.bg}`}>
                <Icon name={STATUS_STYLES[test.status]?.icon || "info"} size={12} />
                {test.status.replace(/_/g, " ")}
              </span>
              {test.winner && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  <Icon name="trophy" size={12} />
                  Winner: {test.winner.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Icon name="git-branch" size={14} className="text-slate-400" />
                {TEST_TYPES[test.type] || test.type}
              </span>
              {test.start_date && (
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" size={14} className="text-slate-400" />
                  {new Date(test.start_date).toLocaleDateString("en-AU")}
                  {test.end_date && ` - ${new Date(test.end_date).toLocaleDateString("en-AU")}`}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Icon name="eye" size={14} className="text-slate-400" />
                {totalImpressions.toLocaleString()} total impressions
              </span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {test.winner && (
              <button
                onClick={handleApplyWinner}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Icon name="check-circle" size={14} />
                Apply Winner
              </button>
            )}
            <button
              onClick={handleRerun}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Icon name="shuffle" size={14} />
              Re-run Test
            </button>
          </div>
        </div>

        {/* Traffic Split Visual */}
        <div className="mt-5">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Traffic Split <InfoTip text="How traffic is distributed between the two variants during the test." />
          </p>
          <div className="h-5 rounded-full overflow-hidden flex bg-slate-100">
            <div
              className="bg-blue-500 transition-all duration-700 flex items-center justify-center"
              style={{ width: `${test.traffic_split}%` }}
            >
              <span className="text-[0.62rem] font-bold text-white">{test.traffic_split}% A</span>
            </div>
            <div
              className="bg-amber-500 transition-all duration-700 flex items-center justify-center"
              style={{ width: `${100 - test.traffic_split}%` }}
            >
              <span className="text-[0.62rem] font-bold text-white">{100 - test.traffic_split}% B</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Variant A */}
        <div className={`bg-white rounded-xl border-2 p-5 transition-all ${test.winner === "a" ? "border-emerald-400 shadow-emerald-100 shadow-md" : "border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">A</span>
            <span className="text-sm font-bold text-slate-700">Control</span>
            {test.winner === "a" && (
              <span className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <Icon name="trophy" size={12} />
                Winner
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-4 break-words bg-slate-50 rounded-lg p-3 border border-slate-100">
            {(test.variant_a as Record<string, string>)?.value || "--"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Impressions</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={test.impressions_a} duration={800} /></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Clicks</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={test.clicks_a} duration={800} /></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CTR</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={ctrA} decimals={2} suffix="%" duration={800} /></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conversions</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={test.conversions_a} duration={800} /></p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Conv. Rate</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={convRateA} decimals={2} suffix="%" duration={800} /></p>
            </div>
          </div>
        </div>

        {/* Variant B */}
        <div className={`bg-white rounded-xl border-2 p-5 transition-all ${test.winner === "b" ? "border-emerald-400 shadow-emerald-100 shadow-md" : "border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">B</span>
            <span className="text-sm font-bold text-slate-700">Challenger</span>
            {test.winner === "b" && (
              <span className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <Icon name="trophy" size={12} />
                Winner
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-4 break-words bg-slate-50 rounded-lg p-3 border border-slate-100">
            {(test.variant_b as Record<string, string>)?.value || "--"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Impressions</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={test.impressions_b} duration={800} /></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Clicks</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={test.clicks_b} duration={800} /></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CTR</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={ctrB} decimals={2} suffix="%" duration={800} /></p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Conversions</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={test.conversions_b} duration={800} /></p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Conv. Rate</p>
              <p className="text-lg font-extrabold text-slate-900"><CountUp end={convRateB} decimals={2} suffix="%" duration={800} /></p>
            </div>
          </div>

          {/* Percentage difference callouts */}
          {totalImpressions > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {ctrDiff !== 0 && (
                <div className={`flex items-center gap-2 text-xs font-bold ${ctrDiff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                  <Icon name={ctrDiff > 0 ? "arrow-up" : "arrow-down"} size={12} />
                  {ctrDiff > 0 ? "+" : ""}{ctrDiff.toFixed(1)}% CTR vs Control
                </div>
              )}
              {convDiff !== 0 && (
                <div className={`flex items-center gap-2 text-xs font-bold ${convDiff > 0 ? "text-emerald-700" : "text-red-600"}`}>
                  <Icon name={convDiff > 0 ? "arrow-up" : "arrow-down"} size={12} />
                  {convDiff > 0 ? "+" : ""}{convDiff.toFixed(1)}% Conv Rate vs Control
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistical Significance Section */}
      {totalImpressions > 0 && (
        <div className={`rounded-xl border-2 p-6 ${confColor.bg} ${confColor.border}`} style={{ animation: "resultCardIn 0.4s ease-out" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${confColor.dot}`} />
            <h2 className="text-lg font-extrabold text-slate-900">Statistical Significance</h2>
            <InfoTip text="We use a two-proportion Z-test to determine whether the difference in CTR between variants is statistically significant." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-white/70 rounded-lg p-4 border border-white">
              <p className="text-xs text-slate-500 mb-1">Z-Score</p>
              <p className="text-2xl font-extrabold text-slate-900">{stats.z.toFixed(3)}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-4 border border-white">
              <p className="text-xs text-slate-500 mb-1">p-Value</p>
              <p className="text-2xl font-extrabold text-slate-900">{stats.pValue.toFixed(4)}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-4 border border-white">
              <p className="text-xs text-slate-500 mb-1">Confidence Level</p>
              <p className={`text-2xl font-extrabold ${confColor.text}`}>
                {stats.confidence.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Formula */}
          <div className="bg-white/50 rounded-lg p-4 border border-white mb-4">
            <p className="text-xs text-slate-500 font-medium mb-2">Formula</p>
            <p className="text-sm font-mono text-slate-700">
              Z = (p1 - p2) / sqrt(p * (1 - p) * (1/n1 + 1/n2))
            </p>
            <p className="text-xs text-slate-400 mt-1">
              where p1={ctrA.toFixed(4)}%, p2={ctrB.toFixed(4)}%, n1={test.impressions_a.toLocaleString()}, n2={test.impressions_b.toLocaleString()}
            </p>
          </div>

          {/* Recommendation */}
          <div className={`rounded-lg p-4 border ${confColor.border} ${confColor.bg}`}>
            <div className="flex items-start gap-3">
              <Icon name={stats.confidence >= 95 ? "check-circle" : stats.confidence >= 80 ? "alert-triangle" : "alert-circle"} size={18} className={confColor.text} />
              <div>
                <p className={`text-sm font-bold ${confColor.text}`}>
                  {stats.confidence >= 95 && betterVariant
                    ? `Variant ${betterVariant} outperforms with ${stats.confidence.toFixed(1)}% confidence. We recommend implementing this variant.`
                    : stats.confidence >= 80 && betterVariant
                      ? `Variant ${betterVariant} shows a promising trend (${stats.confidence.toFixed(1)}% confidence), but more data is needed to reach 95% significance.`
                      : "Not enough data to determine a statistically significant winner. Continue running the test to gather more impressions."
                  }
                </p>
                {totalImpressions < 1000 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Tip: Most tests need at least 1,000 impressions per variant for reliable results.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Comparison Chart */}
      {totalImpressions > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">Performance Comparison</h2>
          <ComparisonBarChart test={test} />
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-5">
        <Link
          href="/broker-portal/ab-tests"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Icon name="arrow-left" size={14} />
          Back to all tests
        </Link>
        <div className="flex gap-2">
          {test.winner && (
            <button
              onClick={handleApplyWinner}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Icon name="check-circle" size={14} />
              Apply Winner
            </button>
          )}
          <button
            onClick={handleRerun}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Icon name="shuffle" size={14} />
            Re-run Test
          </button>
        </div>
      </div>
    </div>
  );
}

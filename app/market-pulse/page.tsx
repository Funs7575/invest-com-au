/**
 * /market-pulse — Market-wide time-series dashboard.
 *
 * Surfaces AGGREGATE trends across the three main data stores we already
 * capture: broker health scores, savings rates, and fee-index snapshots.
 * All outputs are factual descriptive statistics — no per-broker data is
 * surfaced, no rankings-as-advice. ISR (1 h).
 *
 * Data sources:
 *   - broker_health_score_history  → market avg health score over time
 *                                    (anon SELECT policy — use createClient)
 *   - savings_rate_snapshots       → best/avg savings rate over time
 *                                    (anon SELECT policy — use createClient)
 *   - fee_index_snapshots          → fee-index delta series
 *                                    (service-role only — use readFeeIndex)
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  ORGANIZATION_JSONLD,
  CURRENT_YEAR,
  SITE_URL,
} from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  EDITORIAL_ACCURACY_COMMITMENT,
} from "@/lib/compliance";
import { faqJsonLd } from "@/lib/schema-markup";
import { readFeeIndex } from "@/lib/fee-index";
import { createClient } from "@/lib/supabase/server";
import {
  buildFeeTrendPoints,
  buildFeeIndexDeltaSeries,
  buildHealthScoreTrendPoints,
  computeHealthScoreTrendSummary,
  buildSavingsRateTrendPoints,
  computeSavingsRateTrendSummary,
  trimTrendWindow,
  type HealthScoreHistoryRow,
  type SavingsRateRow,
  type FeeTrendPoint,
  type FeeIndexDeltaPoint,
  type HealthScoreTrendPoint,
  type SavingsRateTrendPoint,
} from "@/lib/market-intelligence";

// ─── Page config ─────────────────────────────────────────────────────────────

export const revalidate = 3600;

const MARKET_PULSE_FAQS = [
  {
    q: "What does the Market Pulse dashboard show?",
    a: "Market Pulse shows three aggregate time-series for the Australian investing market: (1) Platform Health Score trend — the market-wide average of Invest.com.au's proprietary safety scores across all active platforms, showing whether the market is getting safer or riskier over time; (2) Best savings rate movement — the highest available savings rate across all tracked platforms, showing the direction of savings rate trends; and (3) Broker fee-index deltas — whether average brokerage costs across the market have risen or fallen period-over-period. All data points are market aggregates — no individual platform is named or ranked on this page.",
  },
  {
    q: "How often is Market Pulse data updated?",
    a: "Market Pulse data is updated daily. Platform health scores are recalculated daily from ASIC register checks and platform disclosures. Savings rates are monitored daily against each platform's published rate schedule. The fee index is recalculated whenever a platform changes its published fee schedule. The page itself refreshes via ISR every hour. The 'Data as of' date shown at the bottom of the page reflects the latest data period.",
  },
  {
    q: "What is the Australian Brokerage Fee Index?",
    a: "The Australian Brokerage Fee Index is Invest.com.au's aggregate measure of the average cost to trade ASX securities across all tracked active platforms. It is computed as a volume-weighted composite of ASX brokerage rates, normalised to a standard $5,000 trade size. A delta of -2% means the market-wide average fee has fallen 2% compared to the prior measurement period — usually driven by a major platform cutting its brokerage rate or a new low-cost entrant gaining share. It is a market-level indicator, not a guide to any specific platform's fee.",
  },
  {
    q: "Is the Market Pulse data personal financial advice?",
    a: "No. All data on the Market Pulse page is general information only. It presents factual aggregate statistics about the Australian investing market and does not recommend any action, product, or platform. It is not personal financial advice and does not take into account your individual circumstances, objectives, or financial situation. The data is intended to help investors understand macro trends, not to guide specific investment decisions.",
  },
];

const marketPulseFaqLd = faqJsonLd(MARKET_PULSE_FAQS);

const PAGE_PATH = "/market-pulse";
const PAGE_TITLE = `Market Pulse: Australian Investing Trends (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Aggregate time-series for the Australian investing market: market-wide platform health score trend, best savings rate movement, and broker fee-index deltas — factual data, updated daily.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    type: "website",
    images: [
      {
        url: "/api/og?title=Market+Pulse&subtitle=Australian+Investing+Trends+Dashboard&type=default",
        width: 1200,
        height: 630,
        alt: "Market Pulse — Australian Investing Trends",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function datasetJsonLd(latestPeriod: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Market Pulse — Australian Investing Trends",
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    keywords: [
      "Australian investing",
      "platform health scores",
      "savings rates",
      "brokerage fee trends",
      "market intelligence",
      "time-series data",
    ],
    creator: ORGANIZATION_JSONLD,
    publisher: ORGANIZATION_JSONLD,
    isAccessibleForFree: true,
    license: `${SITE_URL}/terms`,
    measurementTechnique:
      "Aggregate time-series (daily averages, best-in-market, period-over-period deltas) computed from Invest.com.au's internal broker health, savings-rate, and fee-index records.",
    ...(latestPeriod
      ? {
          dateModified: latestPeriod,
          temporalCoverage: `../${latestPeriod}`,
        }
      : {}),
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtPct(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(dp)}%`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtDelta(n: number | null | undefined, prefix = ""): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${prefix}${Math.abs(n).toFixed(2)}`;
}

// ─── Pure SVG line chart (no external deps) ───────────────────────────────────

/**
 * Server-rendered SVG area/line chart for a numeric series.
 *
 * - No JS, no external libraries.
 * - Renders a filled area + stroke line + terminal dot.
 * - Accepts normalised [0–1] y values and a raw series for display purposes.
 * - Omits itself cleanly for empty / single-point input.
 */
function SvgLineChart({
  points,
  color = "#0f766e",
  width = 600,
  height = 120,
  label,
}: {
  points: { x: number; y: number }[]; // x=index 0..N-1, y=normalised 0–1
  color?: string;
  width?: number;
  height?: number;
  label?: string;
}) {
  if (points.length < 2) return null;

  const pad = { top: 8, right: 8, bottom: 8, left: 8 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const coords = points.map((p) => {
    const svgX = pad.left + (p.x / (points.length - 1)) * plotW;
    const svgY = pad.top + (1 - p.y) * plotH;
    return { svgX, svgY };
  });

  const polylineStr = coords.map((c) => `${c.svgX},${c.svgY}`).join(" ");
  const fillStr = [
    `${pad.left},${pad.top + plotH}`,
    ...coords.map((c) => `${c.svgX},${c.svgY}`),
    `${pad.left + plotW},${pad.top + plotH}`,
  ].join(" ");

  const last = coords[coords.length - 1]!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? "Time-series chart"}
      className="w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <polygon points={fillStr} fill={color} opacity={0.1} />
      <polyline
        points={polylineStr}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.svgX} cy={last.svgY} r="4" fill={color} />
    </svg>
  );
}

/** Normalise an array of numbers to [0, 1] range for SVG rendering. */
function normalise(values: (number | null)[]): number[] {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0.5);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) return values.map(() => 0.5);
  return values.map((v) => (v === null || !Number.isFinite(v) ? 0.5 : (v - min) / (max - min)));
}

// ─── Section wrappers ─────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-bold text-slate-900 mb-1">
      {children}
    </h2>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function TrendBadge({
  direction,
  pctChange,
  higherIsBetter,
}: {
  direction: "falling" | "rising" | "flat" | "insufficient_data";
  pctChange: number | null;
  /** When true: rising = positive (green), falling = negative (red).
   *  When false (fees): falling = positive (green), rising = negative (red). */
  higherIsBetter: boolean;
}) {
  if (direction === "insufficient_data" || pctChange === null) {
    return <span className="text-xs text-slate-500">no trend data yet</span>;
  }

  const isPositive =
    (direction === "rising" && higherIsBetter) ||
    (direction === "falling" && !higherIsBetter);
  const isNegative =
    (direction === "falling" && higherIsBetter) ||
    (direction === "rising" && !higherIsBetter);

  const cls = isPositive
    ? "text-emerald-600"
    : isNegative
      ? "text-rose-600"
      : "text-slate-500";

  const arrow = direction === "rising" ? "▲" : direction === "falling" ? "▼" : "→";
  const pctStr = `${arrow} ${Math.abs(pctChange).toFixed(1)}% over tracked period`;

  return <span className={`text-xs font-semibold ${cls}`}>{pctStr}</span>;
}

// ─── Health score chart section ───────────────────────────────────────────────

function HealthScoreSection({
  trendPoints,
}: {
  trendPoints: HealthScoreTrendPoint[];
}) {
  const summary = computeHealthScoreTrendSummary(trendPoints);
  const yValues = normalise(trendPoints.map((p) => p.avgScore));
  const svgPoints = trendPoints.map((_, i) => ({ x: i, y: yValues[i] ?? 0.5 }));

  return (
    <section aria-labelledby="health-score-heading" className="mb-10">
      <SectionHeading id="health-score-heading">
        Market-Wide Platform Health Score Trend
      </SectionHeading>
      <p className="text-xs text-slate-500 mb-4">
        Daily arithmetic mean of broker health scores across all platforms we
        track. Individual broker scores are never surfaced — only the market
        aggregate is shown. Days with fewer than 2 platforms are suppressed.
      </p>

      {trendPoints.length >= 2 ? (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current avg</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {summary.latest !== null ? `${summary.latest}` : "—"}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Series start</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {summary.earliest !== null ? `${summary.earliest}` : "—"}
                <span className="text-sm font-normal text-slate-500">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Change</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {summary.absoluteChange !== null
                  ? fmtDelta(summary.absoluteChange, "")
                      .replace("−", "−")
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data points</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {summary.pointCount}
              </p>
              <p className="text-xs text-slate-500">daily buckets</p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Avg score over time (0–100 scale)
              </p>
              <TrendBadge
                direction={summary.direction}
                pctChange={summary.pctChange}
                higherIsBetter={true}
              />
            </div>
            <SvgLineChart
              points={svgPoints}
              color="#0f766e"
              width={600}
              height={120}
              label="Market-wide average broker health score over time"
            />
            {/* X-axis labels */}
            {trendPoints.length >= 2 && (
              <div className="flex justify-between mt-1 text-[0.6rem] text-slate-500">
                <span>{trendPoints[0]!.day}</span>
                <span>{trendPoints[trendPoints.length - 1]!.day}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState message="Market health score trend requires at least 2 days of data across multiple platforms. Check back once the daily health-score cron has run for a couple of days." />
      )}

      <p className="mt-3 text-xs text-slate-500">
        Per-platform scores →{" "}
        <Link href="/health-scores" className="font-semibold text-blue-700 underline">
          Platform Health Scores
        </Link>
      </p>
    </section>
  );
}

// ─── Savings rate chart section ───────────────────────────────────────────────

function SavingsRateSection({
  trendPoints,
}: {
  trendPoints: SavingsRateTrendPoint[];
}) {
  const summary = computeSavingsRateTrendSummary(trendPoints);
  const bestValues = trendPoints.map((p) => p.bestRate);
  const avgValues = trendPoints.map((p) => p.avgRate);
  const yBest = normalise(bestValues);
  const yAvg = normalise(avgValues);
  const bestSvgPoints = trendPoints.map((_, i) => ({ x: i, y: yBest[i] ?? 0.5 }));
  const avgSvgPoints = trendPoints.map((_, i) => ({ x: i, y: yAvg[i] ?? 0.5 }));

  return (
    <section aria-labelledby="savings-rate-heading" className="mb-10">
      <SectionHeading id="savings-rate-heading">
        Savings Rate Trend (Savings Accounts)
      </SectionHeading>
      <p className="text-xs text-slate-500 mb-4">
        Daily best (highest) and average standard savings rate across platforms
        we track. Intro/promotional rates are excluded from the market average
        to avoid distorting the underlying trend. Term deposits are shown
        separately below. Days with fewer than 2 platforms are suppressed.
      </p>

      {trendPoints.length >= 2 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current best</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {fmtPct(summary.latestBest)} <span className="text-sm font-normal text-slate-500">p.a.</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current avg</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {fmtPct(summary.latestAvg)} <span className="text-sm font-normal text-slate-500">p.a.</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Best rate change</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {summary.absoluteChangeBest !== null
                  ? `${summary.absoluteChangeBest >= 0 ? "+" : ""}${summary.absoluteChangeBest.toFixed(2)}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data points</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {summary.pointCount}
              </p>
              <p className="text-xs text-slate-500">daily buckets</p>
            </div>
          </div>

          {/* Best rate chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Best rate over time (% p.a.)
              </p>
              <TrendBadge
                direction={summary.direction}
                pctChange={summary.pctChangeBest}
                higherIsBetter={true}
              />
            </div>
            <SvgLineChart
              points={bestSvgPoints}
              color="#1d4ed8"
              width={600}
              height={100}
              label="Best savings rate over time"
            />
            {trendPoints.length >= 2 && (
              <div className="flex justify-between mt-1 text-[0.6rem] text-slate-500">
                <span>{trendPoints[0]!.day}</span>
                <span>{trendPoints[trendPoints.length - 1]!.day}</span>
              </div>
            )}
          </div>

          {/* Avg rate chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Average rate over time (% p.a.)
              </p>
            </div>
            <SvgLineChart
              points={avgSvgPoints}
              color="#7c3aed"
              width={600}
              height={100}
              label="Market-average savings rate over time"
            />
            {trendPoints.length >= 2 && (
              <div className="flex justify-between mt-1 text-[0.6rem] text-slate-500">
                <span>{trendPoints[0]!.day}</span>
                <span>{trendPoints[trendPoints.length - 1]!.day}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState message="Savings rate trend requires at least 2 days of data across multiple platforms. Check back once the savings-rate ingest has run for a couple of days." />
      )}

      <p className="mt-3 text-xs text-slate-500">
        Compare savings accounts →{" "}
        <Link href="/savings-accounts" className="font-semibold text-blue-700 underline">
          Savings accounts
        </Link>
      </p>
    </section>
  );
}

// ─── Fee delta series chart section ──────────────────────────────────────────

function FeeDeltaSection({
  trendPoints,
  deltaPoints,
}: {
  trendPoints: FeeTrendPoint[];
  deltaPoints: FeeIndexDeltaPoint[];
}) {
  // ASX fee level chart
  const asxLevels = trendPoints.map((p) => p.avgAsxFee);
  const asxNorm = normalise(asxLevels);
  const asxSvgPoints = trendPoints.map((_, i) => ({ x: i, y: asxNorm[i] ?? 0.5 }));

  // Delta bar representation — we treat this as a line chart of the delta itself
  const asxDeltas = deltaPoints.map((p) => p.asxDelta);
  const asxDeltaNorm = normalise(asxDeltas);
  const asxDeltaSvg = deltaPoints.map((_, i) => ({ x: i, y: asxDeltaNorm[i] ?? 0.5 }));

  const latestTrend = trendPoints[trendPoints.length - 1];

  return (
    <section aria-labelledby="fee-delta-heading" className="mb-10">
      <SectionHeading id="fee-delta-heading">
        Brokerage Fee Index — Level &amp; Day-on-Day Deltas
      </SectionHeading>
      <p className="text-xs text-slate-500 mb-4">
        Market-wide average ASX brokerage fee (level, left) and period-on-period
        change in that average (delta, right). A positive delta means the average
        fee rose vs the prior day; negative means it fell. Computed from the
        daily fee-index snapshot.
      </p>

      {trendPoints.length >= 2 ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-5">
            {/* Level chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                Avg ASX fee (level)
              </p>
              <p className="text-lg font-bold tabular-nums text-slate-900 mb-3">
                {fmtMoney(latestTrend?.avgAsxFee ?? null)}
                <span className="text-xs font-normal text-slate-500 ml-1">latest</span>
              </p>
              <SvgLineChart
                points={asxSvgPoints}
                color="#a16207"
                width={300}
                height={100}
                label="Average ASX brokerage fee level over time"
              />
              {trendPoints.length >= 2 && (
                <div className="flex justify-between mt-1 text-[0.6rem] text-slate-500">
                  <span>{trendPoints[0]!.period}</span>
                  <span>{trendPoints[trendPoints.length - 1]!.period}</span>
                </div>
              )}
            </div>

            {/* Delta chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                Day-on-day delta (ASX fee)
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Positive = fee rose; negative = fee fell.
              </p>
              {asxDeltaSvg.length >= 2 ? (
                <>
                  <SvgLineChart
                    points={asxDeltaSvg}
                    color="#dc2626"
                    width={300}
                    height={100}
                    label="Day-on-day change in average ASX brokerage fee"
                  />
                  {deltaPoints.length >= 2 && (
                    <div className="flex justify-between mt-1 text-[0.6rem] text-slate-500">
                      <span>{deltaPoints[0]!.period}</span>
                      <span>{deltaPoints[deltaPoints.length - 1]!.period}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Insufficient delta data.</p>
              )}
            </div>
          </div>

          {/* Recent delta table */}
          {deltaPoints.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm" aria-label="Recent market movements">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Period</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">ASX Δ</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600 hidden sm:table-cell">US Δ</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600 hidden md:table-cell">FX Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...deltaPoints]
                    .reverse()
                    .slice(0, 14)
                    .map((d, i) => (
                      <tr
                        key={d.period}
                        className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                      >
                        <td className="px-4 py-2 text-xs text-slate-500 tabular-nums">{d.period}</td>
                        <td className={`px-4 py-2 text-right text-xs tabular-nums font-medium ${d.asxDelta !== null && d.asxDelta > 0 ? "text-rose-600" : d.asxDelta !== null && d.asxDelta < 0 ? "text-emerald-600" : "text-slate-500"}`}>
                          {d.asxDelta !== null ? fmtDelta(d.asxDelta) : "—"}
                        </td>
                        <td className={`px-4 py-2 text-right text-xs tabular-nums font-medium hidden sm:table-cell ${d.usDelta !== null && d.usDelta > 0 ? "text-rose-600" : d.usDelta !== null && d.usDelta < 0 ? "text-emerald-600" : "text-slate-500"}`}>
                          {d.usDelta !== null ? fmtDelta(d.usDelta) : "—"}
                        </td>
                        <td className={`px-4 py-2 text-right text-xs tabular-nums font-medium hidden md:table-cell ${d.fxDelta !== null && d.fxDelta > 0 ? "text-rose-600" : d.fxDelta !== null && d.fxDelta < 0 ? "text-emerald-600" : "text-slate-500"}`}>
                          {d.fxDelta !== null ? `${fmtDelta(d.fxDelta)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-[0.6rem] text-slate-500 border-t border-slate-100">
                Showing latest 14 periods. Green = fee fell (consumer-positive), red = fee rose.
              </p>
            </div>
          )}
        </>
      ) : (
        <EmptyState message="Fee-index data is still being gathered. Check back once the daily fee-index cron has run." />
      )}

      <p className="mt-3 text-xs text-slate-500">
        Full fee index →{" "}
        <Link href="/brokerage-fee-index" className="font-semibold text-blue-700 underline">
          AU Brokerage Fee Index
        </Link>
      </p>
    </section>
  );
}

// ─── Methodology note ─────────────────────────────────────────────────────────

function MethodologyNote() {
  return (
    <section className="mb-8">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-2">Methodology</h2>
        <ul className="text-xs text-slate-500 leading-relaxed space-y-1 list-disc list-inside">
          <li>
            <strong>Health scores</strong> are computed from publicly available data (AFSL
            status, client-money handling, financial disclosures, platform uptime, insurance)
            weighted across 5 dimensions. The market average shown here is the arithmetic
            mean across all platforms with a current score.
          </li>
          <li>
            <strong>Savings rates</strong> are captured daily from product disclosure statements
            and platform rate pages. Only standard rates are used in the market average;
            introductory/promotional rates are excluded to prevent distortion.
          </li>
          <li>
            <strong>Fee-index snapshots</strong> are computed daily from our hourly broker
            price-capture cron. Each platform contributes one vote (its most recent snapshot
            in the capture window). Brokers not marked active are excluded.
          </li>
          <li>
            Days with fewer than 2 platforms in any series are suppressed to prevent
            back-calculation to individual broker values.
          </li>
          <li>
            All data is factual and descriptive. Nothing on this page constitutes financial
            advice or a recommendation to use any particular platform.
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          <Link href="/how-we-verify" className="underline hover:text-slate-900">
            How we verify our data
          </Link>
        </p>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MarketPulsePage() {
  const supabase = await createClient();

  // Fetch all three data sources in parallel
  const [
    { latest: latestFee, history: feeHistory },
    { data: healthHistoryData },
    { data: savingsRateData },
  ] = await Promise.all([
    readFeeIndex(365), // up to 1 year of daily fee snapshots (service-role)
    supabase // anon SELECT policy on broker_health_score_history
      .from("broker_health_score_history")
      .select("broker_slug, overall_score, captured_at")
      .order("captured_at", { ascending: false })
      .limit(5000), // last ~90 days × ~50 brokers
    supabase // anon SELECT policy on savings_rate_snapshots
      .from("savings_rate_snapshots")
      .select("broker_id, rate_bps, captured_at, product_kind, intro_rate_bps")
      .order("captured_at", { ascending: false })
      .limit(5000),
  ]);

  // ── Aggregate ─────────────────────────────────────────────────────────────

  // 1. Health score time series (last 90 days displayed)
  const healthHistory = (healthHistoryData as HealthScoreHistoryRow[] | null) ?? [];
  const HEALTH_WINDOW = 90;
  const allHealthTrendPoints = buildHealthScoreTrendPoints(healthHistory);
  const healthTrendPoints = allHealthTrendPoints.slice(-HEALTH_WINDOW);

  // 2. Savings rate time series (last 90 days displayed)
  const savingsRows = (savingsRateData as SavingsRateRow[] | null) ?? [];
  const SAVINGS_WINDOW = 90;
  const allSavingsTrendPoints = buildSavingsRateTrendPoints(savingsRows);
  const savingsTrendPoints = allSavingsTrendPoints.slice(-SAVINGS_WINDOW);

  // 3. Fee-index delta series (last 90 days displayed)
  const FEE_WINDOW = 90;
  const allFeePoints = buildFeeTrendPoints(feeHistory);
  const feeTrendPoints = trimTrendWindow(allFeePoints, FEE_WINDOW);
  const feeDeltaPoints = buildFeeIndexDeltaSeries(feeTrendPoints);

  // Determine latest period for Dataset JSON-LD
  const latestPeriod =
    latestFee?.period ??
    healthTrendPoints[healthTrendPoints.length - 1]?.day ??
    savingsTrendPoints[savingsTrendPoints.length - 1]?.day ??
    null;

  // ── JSON-LD ───────────────────────────────────────────────────────────────

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Market Pulse" },
  ]);
  const dataset = datasetJsonLd(latestPeriod);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }}
      />
      {marketPulseFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(marketPulseFaqLd) }}
        />
      )}

      <div className="pt-5 pb-12 md:py-12">
        <div className="container-custom max-w-4xl">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500 md:text-sm">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span className="text-slate-700">Market Pulse</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Market Pulse
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base max-w-2xl">
              Aggregate time-series for the Australian retail investing market —
              market-wide health score trends, best savings rates, and broker fee
              movements. All data is factual aggregate; individual broker values
              are never surfaced.
            </p>
            {latestPeriod && (
              <p className="mt-2 text-xs text-slate-500">
                Latest data:{" "}
                <span className="font-semibold text-slate-700">
                  {fmtDate(latestPeriod)}
                </span>
              </p>
            )}
          </header>

          {/* ── 1. Health Score Trend ─────────────────────────────────── */}
          <HealthScoreSection trendPoints={healthTrendPoints} />

          {/* ── 2. Savings Rate Trend ─────────────────────────────────── */}
          <SavingsRateSection trendPoints={savingsTrendPoints} />

          {/* ── 3. Fee Index Delta ────────────────────────────────────── */}
          <FeeDeltaSection
            trendPoints={feeTrendPoints}
            deltaPoints={feeDeltaPoints}
          />

          {/* ── Methodology ──────────────────────────────────────────── */}
          <MethodologyNote />

          {/* ── Cross-links ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
            <Link
              href="/insights"
              className="rounded-xl border border-blue-100 bg-blue-50 p-5 hover:bg-blue-100 transition-colors"
            >
              <p className="text-sm font-semibold text-blue-900">
                Australian Investing Index →
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Snapshot stats: current fee averages, health score distribution,
                advisor supply.
              </p>
            </Link>
            <Link
              href="/health-scores"
              className="rounded-xl border border-slate-200 bg-white p-5 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900">
                Platform Health Scores →
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Per-broker safety breakdowns across 5 dimensions.
              </p>
            </Link>
          </div>

          {/* Compliance */}
          <div className="space-y-2 text-[0.7rem] leading-relaxed text-slate-500 md:text-xs">
            <p>
              <strong className="text-slate-600">General information only.</strong>{" "}
              {GENERAL_ADVICE_WARNING}
            </p>
            <p>{EDITORIAL_ACCURACY_COMMITMENT}</p>
            {latestPeriod && (
              <p>
                Data as of {fmtDate(latestPeriod)}.{" "}
                <Link href="/how-we-verify" className="underline hover:text-slate-900">
                  How we verify
                </Link>
                .
              </p>
            )}
          </div>

        </div>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {MARKET_PULSE_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

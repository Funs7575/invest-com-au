/**
 * /insights — Australian Investing Index dashboard.
 *
 * Renders factual aggregate stats from the fee-index and health-score data.
 * ISR (1 h). No advice language; all outputs are descriptive statistics.
 *
 * Data sources:
 *   - fee_index_snapshots  → daily fee averages (service-role read, see fee-index.ts)
 *   - broker_health_scores → current overall scores (anon SELECT policy)
 *   - professionals        → active advisor counts by state (anon SELECT policy)
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
import { readFeeIndex } from "@/lib/fee-index";
import { createClient } from "@/lib/supabase/server";
import {
  buildCurrentMarketSnapshot,
  buildFeeTrendPoints,
  computeAllFeeTrends,
  buildHealthScoreDistribution,
  buildAdvisorDemandByState,
  trimTrendWindow,
  type FeeTrendPoint,
  type HealthScoreDistribution,
  type AdvisorDemandByState,
  type CurrentMarketSnapshot, // used in datasetJsonLd param
} from "@/lib/market-intelligence";
import Sparkline from "@/components/Sparkline";
import { faqJsonLd } from "@/lib/schema-markup";

// ─── Page config ─────────────────────────────────────────────────────────────

const INSIGHTS_FAQS = [
  {
    q: "What is the Australian Investing Index?",
    a: "The Australian Investing Index is Invest.com.au's live aggregation of retail investing market data, updated daily. It covers the brokerage fee index (mean and median ASX, US, and FX fees across all tracked platforms), the Investor Health Score distribution (aggregate platform quality ratings), and advisor supply by state. All outputs are descriptive statistics drawn from Invest.com.au's own fee snapshots, platform health records, and advisor directory.",
  },
  {
    q: "How often is the brokerage fee data in the Australian Investing Index updated?",
    a: "The fee index draws on daily fee snapshots captured from every tracked platform's pricing page and PDS. The page itself revalidates every hour (ISR). Historical trend lines show the rolling 30-day window so you can see whether average fees have been rising or falling.",
  },
  {
    q: "What platforms are included in the brokerage fee index?",
    a: "Every Australian share trading platform actively tracked by Invest.com.au is included — currently 50+ platforms covering ASX-only, international, crypto, robo-advisors, and multi-asset platforms. Platforms must have at least one verified fee data point to appear in the index. The active platform count is shown at the top of the page for the latest data period.",
  },
  {
    q: "What is the Investor Health Score?",
    a: "The Investor Health Score is Invest.com.au's weighted platform quality rating (0–100) covering five dimensions: fees (25%), product range (20%), safety (20%), platform features (20%), and user experience (15%). The Health Score Distribution chart on this page shows how many platforms fall in each score band, giving you a market-level view of average platform quality.",
  },
];

const insightsFaqLd = faqJsonLd(INSIGHTS_FAQS);

export const revalidate = 3600; // 1 hour ISR

const PAGE_PATH = "/insights";
const PAGE_TITLE = `Australian Investing Index (${CURRENT_YEAR}) — Market Intelligence`;
const PAGE_DESCRIPTION =
  "Factual aggregate statistics on the Australian investing market: average brokerage fees, platform health score distribution, and advisor supply by state — drawn from Invest.com.au's own data.";

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
        url: "/api/og?title=Australian+Investing+Index&subtitle=Market+Intelligence+Dashboard&type=default",
        width: 1200,
        height: 630,
        alt: "Australian Investing Index",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(2)}%`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function datasetJsonLd(snapshot: CurrentMarketSnapshot) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Australian Investing Index",
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    keywords: [
      "Australian investing",
      "brokerage fees",
      "platform health scores",
      "financial advisors",
      "market intelligence",
    ],
    creator: ORGANIZATION_JSONLD,
    publisher: ORGANIZATION_JSONLD,
    isAccessibleForFree: true,
    license: `${SITE_URL}/terms`,
    measurementTechnique:
      "Aggregate statistics (mean, median, distribution) computed from Invest.com.au's internal broker fee snapshots and health score records.",
    ...(snapshot.period
      ? {
          dateModified: snapshot.period,
          temporalCoverage: snapshot.period,
          variableMeasured: [
            {
              "@type": "PropertyValue",
              name: "Average ASX brokerage fee",
              unitText: "AUD",
              value: snapshot.asxFee.mean ?? undefined,
            },
            {
              "@type": "PropertyValue",
              name: "Active broker count",
              value: snapshot.activeBrokerCount,
            },
          ],
        }
      : {}),
  };
}

// ─── Sub-components (all Server-side, pure UI) ───────────────────────────────

function StatCard({
  label,
  value,
  sub,
  spark,
  sparkColor,
  trendLabel,
  trendClass,
}: {
  label: string;
  value: string;
  sub?: string;
  spark?: number[];
  sparkColor?: string;
  trendLabel?: string;
  trendClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
          )}
        </div>
        {spark && spark.length >= 2 && sparkColor && (
          <Sparkline data={spark} color={sparkColor} width={80} height={28} />
        )}
      </div>
      {trendLabel && (
        <p className={`mt-2 text-xs font-semibold ${trendClass ?? "text-slate-500"}`}>
          {trendLabel}
        </p>
      )}
    </div>
  );
}

/** Simple inline SVG bar-chart for health score distribution. */
function HealthDistributionChart({
  distribution,
}: {
  distribution: HealthScoreDistribution;
}) {
  const maxCount = Math.max(...distribution.buckets.map((b) => b.count), 1);

  return (
    <div className="mt-4">
      <div className="flex items-end gap-1.5" style={{ height: 80 }} aria-hidden="true">
        {distribution.buckets.map((bucket) => {
          const heightPct = (bucket.count / maxCount) * 100;
          // Colour: green for high scores, amber for mid, slate for low
          const color =
            bucket.lowerBound >= 80
              ? "#059669"
              : bucket.lowerBound >= 60
              ? "#d97706"
              : "#94a3b8";
          return (
            <div
              key={bucket.lowerBound}
              className="flex-1 flex flex-col justify-end"
            >
              <div
                style={{
                  height: `${Math.max(heightPct, bucket.count > 0 ? 4 : 0)}%`,
                  backgroundColor: color,
                  borderRadius: "2px 2px 0 0",
                }}
                title={`${bucket.label}: ${bucket.count}`}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels — show every other bucket to avoid crowding */}
      <div className="mt-1 flex gap-1.5">
        {distribution.buckets.map((bucket, i) => (
          <div key={bucket.lowerBound} className="flex-1 text-center">
            {i % 2 === 0 && (
              <span className="text-[0.6rem] text-slate-500">
                {bucket.lowerBound}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bar chart for advisor supply by state. */
function AdvisorStateChart({
  demand,
}: {
  demand: AdvisorDemandByState;
}) {
  // Show top 8 named states (skip null-state rows for display)
  const namedStates = demand.byState
    .filter((s) => s.state !== null)
    .slice(0, 8);

  const maxCount = Math.max(...namedStates.map((s) => s.count), 1);

  return (
    <div className="mt-4 space-y-2">
      {namedStates.map((s) => {
        const pct = (s.count / maxCount) * 100;
        return (
          <div key={s.state} className="flex items-center gap-2 text-xs">
            <div className="w-8 shrink-0 text-right font-medium text-slate-600">
              {s.state}
            </div>
            <div className="flex-1 relative h-5">
              <div
                className="h-full rounded bg-blue-500"
                style={{ width: `${Math.max(pct, 2)}%`, opacity: 0.75 }}
                aria-hidden="true"
              />
            </div>
            <div className="w-6 shrink-0 text-right font-semibold tabular-nums text-slate-700">
              {s.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Trend direction label + class ───────────────────────────────────────────

function trendLabel(
  dir: "falling" | "rising" | "flat" | "insufficient_data",
  pct: number | null,
): { text: string; cls: string } {
  if (dir === "insufficient_data" || pct === null) {
    return { text: "no trend data yet", cls: "text-slate-500" };
  }
  if (dir === "falling") {
    return { text: `▼ down ${Math.abs(pct).toFixed(1)}%`, cls: "text-emerald-600" };
  }
  if (dir === "rising") {
    return { text: `▲ up ${pct.toFixed(1)}%`, cls: "text-rose-600" };
  }
  return { text: "→ broadly unchanged", cls: "text-slate-500" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InsightsPage() {
  // ── Fetch data ──────────────────────────────────────────────────────────────
  const supabase = await createClient();

  const [
    { latest, history },
    { data: healthData },
    { data: advisorData },
  ] = await Promise.all([
    readFeeIndex(365), // up to 1 year of daily index rows
    supabase
      .from("broker_health_scores")
      .select("id, broker_slug, overall_score, regulatory_score, client_money_score, financial_stability_score, platform_reliability_score, insurance_score, created_at, updated_at"),
    supabase
      .from("professionals")
      .select("location_state, status")
      .eq("type", "financial_advisor"),
  ]);

  // ── Aggregate ───────────────────────────────────────────────────────────────
  const snapshot = buildCurrentMarketSnapshot(latest);
  const trendPoints = buildFeeTrendPoints(history);
  const trends = computeAllFeeTrends(history);
  const healthDist = buildHealthScoreDistribution(
    (healthData as import("@/lib/types").BrokerHealthScore[] | null) ?? [],
  );
  const advisorDemand = buildAdvisorDemandByState(
    (advisorData as { location_state: string | null; status: string | null }[] | null) ?? [],
    latest?.period ?? new Date().toISOString().slice(0, 10),
  );

  // Sparkline series (chronological)
  const SPARKLINE_WINDOW = 90; // show last 90 days
  const trimmedPoints = trimTrendWindow(trendPoints, SPARKLINE_WINDOW);

  function sparkSeries(key: keyof FeeTrendPoint): number[] {
    return trimmedPoints
      .map((p) => p[key] as number | null)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  }

  const asxSpark = sparkSeries("avgAsxFee");
  const usSpark = sparkSeries("avgUsFee");
  const fxSpark = sparkSeries("avgFxSpread");

  const asxTrend = trendLabel(trends.asx.direction, trends.asx.pctChange);
  const usTrend = trendLabel(trends.us.direction, trends.us.pctChange);
  const fxTrend = trendLabel(trends.fx.direction, trends.fx.pctChange);

  // ── JSON-LD ─────────────────────────────────────────────────────────────────
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Australian Investing Index" },
  ]);
  const dataset = datasetJsonLd(snapshot);

  // ── Render ──────────────────────────────────────────────────────────────────
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
      {insightsFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(insightsFaqLd) }} />
      )}

      <div className="pt-5 pb-12 md:py-12">
        <div className="container-custom max-w-4xl">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500 md:text-sm">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span className="text-slate-700">Australian Investing Index</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Australian Investing Index
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base max-w-2xl">
              Factual aggregate statistics on the Australian retail investing market,
              drawn from Invest.com.au&rsquo;s own fee snapshots, platform health records,
              and advisor directory — updated daily.
            </p>
            {snapshot.period && (
              <p className="mt-2 text-xs text-slate-500">
                Latest data period:{" "}
                <span className="font-semibold text-slate-700">
                  {fmtDate(snapshot.period)}
                </span>
                {" "}· {snapshot.activeBrokerCount} active{" "}
                {snapshot.activeBrokerCount === 1 ? "platform" : "platforms"} tracked.
              </p>
            )}
          </header>

          {/* ── Section 1: Brokerage Fee Index ───────────────────────── */}
          <section aria-labelledby="fee-index-heading" className="mb-10">
            <h2
              id="fee-index-heading"
              className="text-lg font-bold text-slate-900 mb-1"
            >
              Brokerage Fee Index
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Mean and median fee per metric across active platforms we track.
              Trend shows movement over the last {SPARKLINE_WINDOW} days of data.
            </p>

            {snapshot.period ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Avg ASX brokerage"
                  value={fmtMoney(snapshot.asxFee.mean)}
                  sub={`Median ${fmtMoney(snapshot.asxFee.median)} · ${snapshot.asxFee.sample} brokers`}
                  spark={asxSpark}
                  sparkColor="#0f766e"
                  trendLabel={asxTrend.text}
                  trendClass={asxTrend.cls}
                />
                <StatCard
                  label="Avg US-share fee"
                  value={fmtMoney(snapshot.usFee.mean)}
                  sub={`Median ${fmtMoney(snapshot.usFee.median)} · ${snapshot.usFee.sample} brokers`}
                  spark={usSpark}
                  sparkColor="#1d4ed8"
                  trendLabel={usTrend.text}
                  trendClass={usTrend.cls}
                />
                <StatCard
                  label="Avg FX spread"
                  value={fmtPct(snapshot.fxSpread.mean)}
                  sub={`Median ${fmtPct(snapshot.fxSpread.median)} · ${snapshot.fxSpread.sample} brokers`}
                  spark={fxSpark}
                  sparkColor="#a16207"
                  trendLabel={fxTrend.text}
                  trendClass={fxTrend.cls}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                Fee index data is still being gathered. Check back soon.
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Full fee trend history →{" "}
              <Link href="/brokerage-fee-index" className="font-semibold text-blue-700 underline">
                AU Brokerage Fee Index
              </Link>
            </p>
          </section>

          {/* ── Section 2: Platform Health Score Distribution ────────── */}
          <section aria-labelledby="health-dist-heading" className="mb-10">
            <h2
              id="health-dist-heading"
              className="text-lg font-bold text-slate-900 mb-1"
            >
              Platform Health Score Distribution
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              How many platforms score in each 10-point bracket (0–100 scale).
              Scores reflect regulatory compliance, client money handling, financial
              stability, platform reliability, and insurance coverage.
            </p>

            {healthDist.total > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
                  <StatCard
                    label="Mean health score"
                    value={healthDist.mean !== null ? `${healthDist.mean}` : "—"}
                    sub={`across ${healthDist.total} platforms`}
                  />
                  <StatCard
                    label="Median health score"
                    value={healthDist.median !== null ? `${healthDist.median}` : "—"}
                    sub="outlier-resistant mid-point"
                  />
                  <StatCard
                    label="Platforms scored"
                    value={String(healthDist.total)}
                    sub="with an active health score"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Score distribution (0–100)
                  </p>
                  <HealthDistributionChart distribution={healthDist} />
                  <p className="mt-3 text-[0.68rem] text-slate-500">
                    Green = 80+, amber = 60–79, slate = below 60.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                Health score data is not yet available.
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Full per-platform scores →{" "}
              <Link href="/health-scores" className="font-semibold text-blue-700 underline">
                Platform Health Scores
              </Link>
            </p>
          </section>

          {/* ── Section 3: Advisor Supply by State ───────────────────── */}
          <section aria-labelledby="advisor-state-heading" className="mb-10">
            <h2
              id="advisor-state-heading"
              className="text-lg font-bold text-slate-900 mb-1"
            >
              Financial Advisor Supply by State
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Count of active financial advisors in our directory, grouped by
              Australian state or territory. These are factual supply figures —
              not a ranking of advice quality.
            </p>

            {advisorDemand.total > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 mb-4">
                  <StatCard
                    label="Total active advisors"
                    value={String(advisorDemand.total)}
                    sub="in our directory"
                  />
                  <StatCard
                    label="States represented"
                    value={String(advisorDemand.byState.filter((s) => s.state !== null).length)}
                    sub="including territories"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Advisors by state
                  </p>
                  <AdvisorStateChart demand={advisorDemand} />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                Advisor directory data is still being gathered.
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Find an advisor →{" "}
              <Link href="/advisors" className="font-semibold text-blue-700 underline">
                Browse financial advisors
              </Link>
            </p>
          </section>

          {/* ── Market Pulse CTA ─────────────────────────────────────── */}
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-5 mb-4">
            <h2 className="text-base font-bold text-teal-900">
              Market Pulse — Aggregate Time-Series Dashboard
            </h2>
            <p className="mt-1 text-sm text-teal-800">
              See how health scores, savings rates, and fee indexes have moved
              over time — daily aggregate trends across all tracked platforms.
            </p>
            <Link
              href="/market-pulse"
              className="mt-3 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              View Market Pulse →
            </Link>
          </div>

          {/* ── Narrative report CTA ─────────────────────────────────── */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 mb-8">
            <h2 className="text-base font-bold text-blue-900">
              State of Australian Investing — Narrative Report
            </h2>
            <p className="mt-1 text-sm text-blue-800">
              Read the full written analysis of these trends with context, methodology,
              and period-on-period commentary.
            </p>
            <Link
              href="/insights/state-of-australian-investing"
              className="mt-3 inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Read the report →
            </Link>
          </div>

          {/* FAQ */}
          <section className="mb-8 border-t border-slate-200 pt-8">
            <h2 className="text-base font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {INSIGHTS_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none text-sm">
                    {faq.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Compliance */}
          <div className="space-y-2 text-[0.7rem] leading-relaxed text-slate-500 md:text-xs">
            <p>
              <strong className="text-slate-600">General information only.</strong>{" "}
              {GENERAL_ADVICE_WARNING}
            </p>
            <p>{EDITORIAL_ACCURACY_COMMITMENT}</p>
            <p>
              Data as of {fmtDate(snapshot.period)}.{" "}
              <Link href="/how-we-verify" className="underline hover:text-slate-900">
                How we verify
              </Link>
              .
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

/**
 * /insights/state-of-australian-investing
 *
 * "State of Australian Investing" — narrative report page.
 *
 * Uses the same aggregated data as /insights but renders it as a structured
 * article with written prose. Suitable for media citation, SEO, and E-E-A-T
 * signals. Article + Dataset JSON-LD.
 *
 * ISR: 3600 s (1 h) — same cadence as the fee index.
 * AFSL: factual aggregate data only; no advice language; no individual
 *       broker is ranked as "best" or "recommended".
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  ORGANIZATION_JSONLD,
  REVIEW_AUTHOR,
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
  feeTrendNarrative,
} from "@/lib/market-intelligence";
import Sparkline from "@/components/Sparkline";
import type { FeeTrendPoint } from "@/lib/market-intelligence";

// ─── Page config ─────────────────────────────────────────────────────────────

export const revalidate = 3600;

const PAGE_PATH = "/insights/state-of-australian-investing";
const REPORT_TITLE = `State of Australian Investing ${CURRENT_YEAR}`;
const REPORT_DESCRIPTION =
  `A factual analysis of Australian retail investing in ${CURRENT_YEAR}: average brokerage fees, ` +
  "platform health score distribution, advisor supply by state, and observable trends — " +
  "drawn from Invest.com.au's own data.";

export const metadata: Metadata = {
  title: `${REPORT_TITLE} — Invest.com.au`,
  description: REPORT_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: REPORT_TITLE,
    description: REPORT_DESCRIPTION,
    url: PAGE_PATH,
    type: "article",
    images: [
      {
        url: `/api/og?title=State+of+Australian+Investing+${CURRENT_YEAR}&subtitle=Annual+Market+Report&type=default`,
        width: 1200,
        height: 630,
        alt: REPORT_TITLE,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtMoney(n: number | null): string {
  if (n === null) return "N/A";
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "N/A";
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

function reportArticleJsonLd(publishedPeriod: string | null) {
  const now = new Date().toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: REPORT_TITLE,
    description: REPORT_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    datePublished: publishedPeriod ?? now,
    dateModified: publishedPeriod ?? now,
    author: {
      "@type": "Organization",
      name: REVIEW_AUTHOR.name,
      url: REVIEW_AUTHOR.url,
    },
    publisher: ORGANIZATION_JSONLD,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(PAGE_PATH),
    },
    about: {
      "@type": "Thing",
      name: "Australian Retail Investing Market",
    },
    isAccessibleForFree: true,
  };
}

function datasetJsonLd(period: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: REPORT_TITLE,
    description: REPORT_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    creator: ORGANIZATION_JSONLD,
    publisher: ORGANIZATION_JSONLD,
    isAccessibleForFree: true,
    license: `${SITE_URL}/terms`,
    ...(period
      ? {
          dateModified: period,
          temporalCoverage: `2026/${period}`,
        }
      : {}),
  };
}

// ─── Inline sparkline wrapper (Server component, wraps client Sparkline) ─────

function MiniSpark({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  if (data.length < 2) return null;
  return (
    <span className="inline-block align-middle ml-2">
      <Sparkline data={data} color={color} width={64} height={20} showFill={false} />
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StateOfAustralianInvestingPage() {
  // ── Fetch ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();

  const [
    { latest, history },
    { data: healthData },
    { data: advisorData },
  ] = await Promise.all([
    readFeeIndex(400),
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
    snapshot.period ?? new Date().toISOString().slice(0, 10),
  );

  // Sparklines
  function sparkSeries(key: keyof FeeTrendPoint): number[] {
    return trendPoints
      .map((p) => p[key] as number | null)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  }

  const asxSpark = sparkSeries("avgAsxFee");
  const usSpark = sparkSeries("avgUsFee");
  const fxSpark = sparkSeries("avgFxSpread");

  // Top two states by advisor count
  const topStates = advisorDemand.byState.filter((s) => s.state !== null).slice(0, 3);

  // ── JSON-LD ─────────────────────────────────────────────────────────────────
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Australian Investing Index", url: absoluteUrl("/insights") },
    { name: REPORT_TITLE },
  ]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportArticleJsonLd(snapshot.period)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd(snapshot.period)) }}
      />

      <article className="pt-5 pb-14 md:py-14">
        <div className="container-custom max-w-3xl">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500 md:text-sm">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <Link href="/insights" className="hover:text-slate-900">
              Australian Investing Index
            </Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span className="text-slate-700">State of Australian Investing</span>
          </nav>

          {/* Header */}
          <header className="mb-8 border-b border-slate-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
              Annual Report
            </p>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {REPORT_TITLE}
            </h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              {REPORT_DESCRIPTION}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>
                Published by{" "}
                <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-800">
                  {REVIEW_AUTHOR.name}
                </a>
              </span>
              {snapshot.period && (
                <span>
                  Data as of <strong className="text-slate-700">{fmtDate(snapshot.period)}</strong>
                </span>
              )}
            </div>
          </header>

          {/* ── Executive Summary ─────────────────────────────────────── */}
          <section aria-labelledby="exec-summary-heading" className="mb-8">
            <h2 id="exec-summary-heading" className="text-xl font-bold text-slate-900 mb-3">
              Executive Summary
            </h2>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-3 text-sm text-slate-700">
              {snapshot.period ? (
                <ul className="space-y-2">
                  <li>
                    <strong>Brokerage fees:</strong>{" "}
                    {snapshot.activeBrokerCount > 0 && (
                      <>
                        Across {snapshot.activeBrokerCount} actively-tracked platforms,
                        the average ASX per-trade brokerage stands at{" "}
                        <strong>{fmtMoney(snapshot.asxFee.mean)}</strong> (median{" "}
                        {fmtMoney(snapshot.asxFee.median)}). {feeTrendNarrative(trends.asx)}
                      </>
                    )}
                  </li>
                  <li>
                    <strong>US-share fees:</strong>{" "}
                    Average US-share fee is{" "}
                    <strong>{fmtMoney(snapshot.usFee.mean)}</strong> (median{" "}
                    {fmtMoney(snapshot.usFee.median)}).{" "}
                    {feeTrendNarrative(trends.us)}
                  </li>
                  <li>
                    <strong>FX spread:</strong>{" "}
                    Average currency-conversion spread is{" "}
                    <strong>{fmtPct(snapshot.fxSpread.mean)}</strong> (median{" "}
                    {fmtPct(snapshot.fxSpread.median)}).{" "}
                    {feeTrendNarrative(trends.fx)}
                  </li>
                  {healthDist.total > 0 && (
                    <li>
                      <strong>Platform health:</strong>{" "}
                      Mean overall health score across {healthDist.total} scored platforms
                      is{" "}
                      <strong>{healthDist.mean ?? "—"}/100</strong> (median{" "}
                      {healthDist.median ?? "—"}/100).
                    </li>
                  )}
                  {advisorDemand.total > 0 && (
                    <li>
                      <strong>Advisor supply:</strong>{" "}
                      {advisorDemand.total} active financial advisors in our directory
                      across{" "}
                      {advisorDemand.byState.filter((s) => s.state !== null).length} states
                      and territories.{" "}
                      {topStates.length > 0 && (
                        <>
                          The most-represented states are{" "}
                          {topStates.map((s, i) => (
                            <span key={s.state ?? "other"}>
                              {s.state} ({s.count})
                              {i < topStates.length - 1 ? ", " : "."}
                            </span>
                          ))}
                        </>
                      )}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-slate-500 italic">
                  Aggregate data is being gathered. Check back soon.
                </p>
              )}
            </div>
          </section>

          {/* ── Section 1: Brokerage Fees ─────────────────────────────── */}
          <section aria-labelledby="fees-heading" className="mb-10">
            <h2 id="fees-heading" className="text-xl font-bold text-slate-900 mb-3">
              1. Brokerage Fees
            </h2>

            <p className="text-sm text-slate-700 mb-4">
              The AU Brokerage Fee Index tracks three fee metrics across every
              active platform in our database: the per-trade ASX brokerage charge,
              the US-share equivalent fee, and the FX spread applied to currency
              conversion. All figures below are simple means and medians across the
              platforms that publish a value for each metric.
            </p>

            {snapshot.period ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <caption className="sr-only">
                    Current fee index figures and trends
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th scope="col" className="py-2 pr-4 text-left font-medium">Metric</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Mean</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Median</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Platforms</th>
                      <th scope="col" className="pl-3 py-2 text-right font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <th scope="row" className="py-3 pr-4 text-left font-medium text-slate-700">
                        ASX brokerage
                        <MiniSpark data={asxSpark} color="#0f766e" />
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(snapshot.asxFee.mean)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{fmtMoney(snapshot.asxFee.median)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{snapshot.asxFee.sample}</td>
                      <td className="pl-3 py-3 text-right text-xs text-slate-600">{feeTrendNarrative(trends.asx).replace(/^Average ASX brokerage /, "")}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th scope="row" className="py-3 pr-4 text-left font-medium text-slate-700">
                        US-share fee
                        <MiniSpark data={usSpark} color="#1d4ed8" />
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(snapshot.usFee.mean)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{fmtMoney(snapshot.usFee.median)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{snapshot.usFee.sample}</td>
                      <td className="pl-3 py-3 text-right text-xs text-slate-600">{feeTrendNarrative(trends.us).replace(/^Average US-share fee /, "")}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="py-3 pr-4 text-left font-medium text-slate-700">
                        FX spread
                        <MiniSpark data={fxSpark} color="#a16207" />
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">{fmtPct(snapshot.fxSpread.mean)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{fmtPct(snapshot.fxSpread.median)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{snapshot.fxSpread.sample}</td>
                      <td className="pl-3 py-3 text-right text-xs text-slate-600">{feeTrendNarrative(trends.fx).replace(/^Average FX spread /, "")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Fee data not yet available.
              </p>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Methodology: one fee snapshot per active broker, simple mean
              and median across brokers that publish a value. Updated daily.{" "}
              <Link href="/brokerage-fee-index" className="underline hover:text-slate-800">
                Full fee index methodology →
              </Link>
            </p>
          </section>

          {/* ── Section 2: Platform Health ────────────────────────────── */}
          {healthDist.total > 0 && (
            <section aria-labelledby="health-heading" className="mb-10">
              <h2 id="health-heading" className="text-xl font-bold text-slate-900 mb-3">
                2. Platform Health Scores
              </h2>

              <p className="text-sm text-slate-700 mb-4">
                Invest.com.au assigns each platform a proprietary 0–100 health score
                across five dimensions: regulatory compliance, client money handling,
                financial stability, platform reliability, and insurance coverage. This
                section reports the distribution of current scores — not individual
                platform scores.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {healthDist.mean ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Mean score</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {healthDist.median ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Median score</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {healthDist.total}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Platforms scored</p>
                </div>
              </div>

              <p className="text-sm text-slate-700">
                Score distribution across the {healthDist.total} scored platforms:
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <caption className="sr-only">
                    Health score distribution by 10-point bracket
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th scope="col" className="py-2 pr-4 text-left font-medium">Score bracket</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Platforms</th>
                      <th scope="col" className="pl-3 py-2 text-left font-medium">
                        <span className="sr-only">Bar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthDist.buckets
                      .filter((b) => b.count > 0)
                      .map((b) => {
                        const maxInBuckets = Math.max(...healthDist.buckets.map((x) => x.count), 1);
                        const pct = (b.count / maxInBuckets) * 100;
                        return (
                          <tr key={b.lowerBound} className="border-b border-slate-100 last:border-0">
                            <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-700">
                              {b.label}
                            </th>
                            <td className="px-3 py-2 text-right tabular-nums">{b.count}</td>
                            <td className="pl-3 py-2">
                              <div
                                className="h-3 rounded"
                                style={{
                                  width: `${Math.max(pct, 4)}%`,
                                  backgroundColor:
                                    b.lowerBound >= 80
                                      ? "#059669"
                                      : b.lowerBound >= 60
                                      ? "#d97706"
                                      : "#94a3b8",
                                }}
                                aria-hidden="true"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Full per-platform scores →{" "}
                <Link href="/health-scores" className="underline hover:text-slate-800">
                  Platform Health Scores
                </Link>
              </p>
            </section>
          )}

          {/* ── Section 3: Advisor Supply ──────────────────────────────── */}
          {advisorDemand.total > 0 && (
            <section aria-labelledby="advisor-heading" className="mb-10">
              <h2 id="advisor-heading" className="text-xl font-bold text-slate-900 mb-3">
                3. Financial Advisor Supply
              </h2>

              <p className="text-sm text-slate-700 mb-4">
                The following figures reflect the count of active financial advisors
                listed in Invest.com.au&rsquo;s verified directory, grouped by Australian
                state and territory. These are supply-side counts — they reflect which
                advisors have profiles in our directory and do not imply endorsement.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <caption className="sr-only">
                    Active advisor count by state and territory
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th scope="col" className="py-2 pr-4 text-left font-medium">State / Territory</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Advisors</th>
                      <th scope="col" className="pl-3 py-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advisorDemand.byState
                      .filter((s) => s.state !== null)
                      .map((s) => {
                        const share =
                          advisorDemand.total > 0
                            ? ((s.count / advisorDemand.total) * 100).toFixed(1)
                            : "—";
                        return (
                          <tr key={s.state} className="border-b border-slate-100 last:border-0">
                            <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-700">
                              {s.state}
                            </th>
                            <td className="px-3 py-2 text-right tabular-nums">{s.count}</td>
                            <td className="pl-3 py-2 text-right tabular-nums text-slate-500">{share}%</td>
                          </tr>
                        );
                      })}
                    <tr className="border-t-2 border-slate-200 font-bold">
                      <th scope="row" className="py-2 pr-4 text-left text-slate-800">
                        Total
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums">{advisorDemand.total}</td>
                      <td className="pl-3 py-2 text-right text-slate-500">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Find an advisor →{" "}
                <Link href="/advisors" className="underline hover:text-slate-800">
                  Browse the advisor directory
                </Link>
              </p>
            </section>
          )}

          {/* ── Methodology ───────────────────────────────────────────── */}
          <section
            aria-labelledby="methodology-heading"
            className="mb-10 rounded-xl border border-slate-200 bg-slate-50 p-5"
          >
            <h2
              id="methodology-heading"
              className="text-base font-bold text-slate-900 mb-3"
            >
              Methodology &amp; Data Sources
            </h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <strong className="text-slate-800">Fee data.</strong> Sourced from
                Invest.com.au&rsquo;s internal fee snapshots — timestamped captures of
                each active platform&rsquo;s published fees. One vote per active broker
                per day; simple mean and median across platforms that publish a value.
                Updated daily.
              </li>
              <li>
                <strong className="text-slate-800">Health scores.</strong> Proprietary
                five-dimension scores assigned by Invest.com.au&rsquo;s research team.
                Distribution statistics reflect the current snapshot of scored platforms.
                Individual scores are on the{" "}
                <Link href="/health-scores" className="underline hover:text-slate-800">
                  Platform Health Scores
                </Link>{" "}
                page.
              </li>
              <li>
                <strong className="text-slate-800">Advisor supply.</strong> Counts
                active advisors from Invest.com.au&rsquo;s verified advisor directory.
                &ldquo;Active&rdquo; means the profile is currently publicly listed. Not all
                advisors in Australia are listed; these figures represent only those
                with profiles in our directory.
              </li>
              <li>
                <strong className="text-slate-800">Trend direction.</strong> Described
                as rising / falling when the percentage change over the full tracked
                window exceeds ±1%. Within ±1% is &ldquo;broadly unchanged&rdquo;. This is
                a descriptive observation, not a forecast.
              </li>
            </ul>
          </section>

          {/* ── Related links ─────────────────────────────────────────── */}
          <nav aria-label="Related pages" className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Related</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/insights" className="text-blue-700 underline hover:text-blue-900">
                  Australian Investing Index dashboard
                </Link>
              </li>
              <li>
                <Link href="/brokerage-fee-index" className="text-blue-700 underline hover:text-blue-900">
                  AU Brokerage Fee Index (daily data)
                </Link>
              </li>
              <li>
                <Link href="/health-scores" className="text-blue-700 underline hover:text-blue-900">
                  Platform Health Scores (per-platform)
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-blue-700 underline hover:text-blue-900">
                  Compare investing platforms
                </Link>
              </li>
              <li>
                <Link href="/advisors" className="text-blue-700 underline hover:text-blue-900">
                  Find a financial advisor
                </Link>
              </li>
            </ul>
          </nav>

          {/* Compliance */}
          <div className="space-y-2 text-[0.7rem] leading-relaxed text-slate-500 md:text-xs border-t border-slate-200 pt-6">
            <p>
              <strong className="text-slate-600">General information only.</strong>{" "}
              {GENERAL_ADVICE_WARNING}
            </p>
            <p>{EDITORIAL_ACCURACY_COMMITMENT}</p>
            <p>
              Compiled by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>
              . Data as of {fmtDate(snapshot.period)}.{" "}
              <Link href="/how-we-verify" className="underline hover:text-slate-900">
                How we verify
              </Link>
              .
            </p>
          </div>

        </div>
      </article>
    </>
  );
}

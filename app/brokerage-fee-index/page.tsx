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
import {
  readFeeIndex,
  computeTrend,
  type FeeIndexSnapshot,
  type FeeIndexTrend,
  type TrendDelta,
} from "@/lib/fee-index";
import Sparkline from "@/components/Sparkline";
import { faqJsonLd } from "@/lib/schema-markup";

const BROKERAGE_FEE_FAQS = [
  {
    q: "What is the average brokerage fee for ASX shares in Australia?",
    a: "Based on our fee index, the average ASX per-trade brokerage across major Australian platforms sits around $9–$11 for trades under $10,000. Flat-fee brokers (SelfWealth at $9.50, CMC Markets Invest at $0 for the first trade then $11) have driven the average down significantly since 2020. Percentage-fee brokers (CommSec at 0.10% min $19.95, Westpac at 0.11% min $19.95) are more expensive for smaller trades but can be cheaper on very large trades. The median fee matters more than the average for small portfolios — one outlier with high fees can skew the average.",
  },
  {
    q: "Which Australian broker has the lowest brokerage fee?",
    a: "For ASX shares: CommSec Pocket ($2 flat for trades up to $1,000; 0.20% above), Superhero ($0 for ETFs; $5 for shares), and Pearler ($6.50 flat) are among the cheapest. For US shares: Stake (USD$3 flat), CMC Markets (0.15% min USD$3.99), and Selfwealth (AUD$9.50 + FX spread) are competitive. For most regular investors, the FX spread on US share trades is often a larger cost than brokerage — compare the FX rate offered (typically 0.5–0.7% above mid-market) across platforms when buying US or international shares.",
  },
  {
    q: "What is an FX spread and why does it matter for share trading?",
    a: "The FX spread is the difference between the exchange rate you receive and the true mid-market rate when converting AUD to USD (or another currency) to buy international shares. It's charged as a percentage of the transaction value. A 0.60% FX spread on a $10,000 US share trade costs $60 in currency conversion — more than the stated brokerage on many platforms. Some brokers (like Interactive Brokers) offer near-market FX rates (0.08–0.20%), making them significantly cheaper for international share trading despite higher brokerage on smaller trades.",
  },
  {
    q: "How do brokerage fees affect long-term investment returns?",
    a: "Brokerage affects returns in two ways: the direct cost of each trade, and the compounding cost of buying/selling frequently. On a $5,000 monthly investment with $9.50 brokerage, you pay 0.19% per purchase — small but real. More significantly, high brokerage discourages regular investing (because small amounts become uneconomical), which can reduce investment frequency and long-run returns. The biggest cost optimisation for regular investors is choosing a flat-fee broker over a percentage-fee broker, minimising trades (buy-and-hold vs active trading), and keeping individual transactions large enough that the brokerage as a percentage of trade value stays under 0.20%.",
  },
];

const brokerageFaqLd = faqJsonLd(BROKERAGE_FEE_FAQS);

const PAGE_PATH = "/brokerage-fee-index";
const PAGE_TITLE = `AU Brokerage Fee Index (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "The AU Brokerage Fee Index tracks the average and median ASX per-trade brokerage, US-share fee and FX spread across the Australian trading platforms we monitor — computed from our own fee snapshots, with a quarter-on-quarter and year-on-year trend.";

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
        url: "/api/og?title=AU+Brokerage+Fee+Index&subtitle=Average+ASX%2C+US+%26+FX+fees+across+Australian+platforms&type=default",
        width: 1200,
        height: 630,
        alt: "AU Brokerage Fee Index",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

// Recompute the page from the stored index at most hourly. The
// underlying index row only changes once a day (the cron upserts it),
// so an hourly ISR window is comfortably fresh while keeping the page
// fully static between renders.
export const revalidate = 3600;

// ─── Formatting helpers (display only) ───────────────────────────

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

/** Build an ascending chronological series of one metric for the sparkline. */
function series(
  history: FeeIndexSnapshot[],
  key: "avg_asx_fee" | "avg_us_fee" | "avg_fx_spread",
): number[] {
  return [...history]
    .reverse() // history is DESC by period → make it chronological
    .map((row) => row[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

/** A direction label + colour for a trend delta, lower-is-cheaper framing. */
function trendCopy(d: TrendDelta | undefined): {
  text: string;
  className: string;
} {
  if (!d || d.change === null || d.changePct === null) {
    return { text: "no comparable data", className: "text-slate-400" };
  }
  if (d.change === 0) return { text: "no change", className: "text-slate-500" };
  // Falling fees = good (green); rising = red. Factual framing only.
  const dir = d.change < 0 ? "down" : "up";
  const cls = d.change < 0 ? "text-emerald-600" : "text-rose-600";
  const arrow = d.change < 0 ? "▼" : "▲";
  return {
    text: `${arrow} ${dir} ${Math.abs(d.changePct).toFixed(1)}%`,
    className: cls,
  };
}

// ─── Dataset JSON-LD (factual data product) ──────────────────────

function datasetJsonLd(latest: FeeIndexSnapshot | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "AU Brokerage Fee Index",
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    keywords: [
      "brokerage fees",
      "ASX trading fees",
      "Australian brokers",
      "FX spread",
      "fee comparison",
    ],
    creator: ORGANIZATION_JSONLD,
    publisher: ORGANIZATION_JSONLD,
    isAccessibleForFree: true,
    license: `${SITE_URL}/terms`,
    measurementTechnique:
      "Mean and median of the latest fee snapshot per active broker, computed from internal broker fee snapshots.",
    ...(latest
      ? {
          dateModified: latest.period,
          temporalCoverage: latest.period,
          variableMeasured: [
            {
              "@type": "PropertyValue",
              name: "Average ASX per-trade brokerage",
              unitText: "AUD",
              value: latest.avg_asx_fee ?? undefined,
            },
            {
              "@type": "PropertyValue",
              name: "Average US-share fee",
              value: latest.avg_us_fee ?? undefined,
            },
            {
              "@type": "PropertyValue",
              name: "Average FX spread",
              unitText: "PERCENT",
              value: latest.avg_fx_spread ?? undefined,
            },
          ],
        }
      : {}),
  };
}

// ─── Sub-components ──────────────────────────────────────────────

function HeadlineCard({
  label,
  mean,
  median,
  sample,
  fmt,
  spark,
  sparkColor,
}: {
  label: string;
  mean: number | null;
  median: number | null;
  sample: number;
  fmt: (n: number | null) => string;
  spark: number[];
  sparkColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {fmt(mean)}
          </p>
        </div>
        {spark.length >= 2 && (
          <Sparkline data={spark} color={sparkColor} width={84} height={32} />
        )}
      </div>
      <dl className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <div>
          <dt className="inline">Median: </dt>
          <dd className="inline font-semibold tabular-nums text-slate-700">
            {fmt(median)}
          </dd>
        </div>
        <div>
          <dt className="inline">Sample: </dt>
          <dd className="inline font-semibold tabular-nums text-slate-700">
            {sample} {sample === 1 ? "broker" : "brokers"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TrendRow({
  label,
  quarter,
  year,
  fmt,
}: {
  label: string;
  quarter: TrendDelta | undefined;
  year: TrendDelta | undefined;
  fmt: (n: number | null) => string;
}) {
  const q = trendCopy(quarter);
  const y = trendCopy(year);
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <th scope="row" className="py-2.5 pr-4 text-left font-medium text-slate-700">
        {label}
      </th>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
        {fmt(quarter?.previous ?? null)}
      </td>
      <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${q.className}`}>
        {q.text}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
        {fmt(year?.previous ?? null)}
      </td>
      <td className={`pl-3 py-2.5 text-right font-semibold tabular-nums ${y.className}`}>
        {y.text}
      </td>
    </tr>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default async function BrokerageFeeIndexPage() {
  const { latest, history } = await readFeeIndex();
  const trend: FeeIndexTrend | null = latest
    ? computeTrend(latest, history)
    : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "AU Brokerage Fee Index" },
  ]);
  const dataset = datasetJsonLd(latest);

  const asxSpark = series(history, "avg_asx_fee");
  const usSpark = series(history, "avg_us_fee");
  const fxSpark = series(history, "avg_fx_spread");

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
      {brokerageFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brokerageFaqLd) }} />
      )}

      <div className="pt-5 pb-10 md:py-12">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500 md:text-sm">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <span className="text-slate-700">Brokerage Fee Index</span>
          </nav>

          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              AU Brokerage Fee Index
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              A factual snapshot of what it costs to trade through the Australian
              platforms we track — the average and median ASX per-trade
              brokerage, US-share fee and FX spread, computed from our own fee
              snapshots.
            </p>
            {latest && (
              <p className="mt-2 text-xs text-slate-500">
                Latest index period:{" "}
                <span className="font-semibold text-slate-700">
                  {fmtDate(latest.period)}
                </span>{" "}
                · based on {latest.broker_count}{" "}
                {latest.broker_count === 1 ? "active broker" : "active brokers"}.
              </p>
            )}
          </header>

          {latest ? (
            <>
              {/* Headline cards */}
              <section aria-labelledby="headline-heading">
                <h2 id="headline-heading" className="sr-only">
                  Latest index figures
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <HeadlineCard
                    label="Avg ASX brokerage"
                    mean={latest.avg_asx_fee}
                    median={latest.median_asx_fee}
                    sample={latest.asx_fee_sample}
                    fmt={fmtMoney}
                    spark={asxSpark}
                    sparkColor="#0f766e"
                  />
                  <HeadlineCard
                    label="Avg US-share fee"
                    mean={latest.avg_us_fee}
                    median={latest.median_us_fee}
                    sample={latest.us_fee_sample}
                    fmt={fmtMoney}
                    spark={usSpark}
                    sparkColor="#1d4ed8"
                  />
                  <HeadlineCard
                    label="Avg FX spread"
                    mean={latest.avg_fx_spread}
                    median={latest.median_fx_spread}
                    sample={latest.fx_spread_sample}
                    fmt={fmtPct}
                    spark={fxSpark}
                    sparkColor="#a16207"
                  />
                </div>
              </section>

              {/* Trend table */}
              {trend && (trend.quarter || trend.year) && (
                <section aria-labelledby="trend-heading" className="mt-8">
                  <h2
                    id="trend-heading"
                    className="text-base font-bold text-slate-900 md:text-lg"
                  >
                    How fees have moved
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Change in the average versus the nearest published index
                    around three months (QoQ) and twelve months (YoY) ago. A
                    fall means the typical fee got cheaper.
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[34rem] text-sm">
                      <caption className="sr-only">
                        Quarter-on-quarter and year-on-year change in average
                        brokerage fees
                      </caption>
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <th scope="col" className="py-2 pr-4 text-left font-medium">
                            Metric
                          </th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">
                            ~3mo ago
                          </th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">
                            QoQ
                          </th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">
                            ~12mo ago
                          </th>
                          <th scope="col" className="pl-3 py-2 text-right font-medium">
                            YoY
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <TrendRow
                          label="ASX brokerage"
                          quarter={trend.quarter?.avgAsxFee}
                          year={trend.year?.avgAsxFee}
                          fmt={fmtMoney}
                        />
                        <TrendRow
                          label="US-share fee"
                          quarter={trend.quarter?.avgUsFee}
                          year={trend.year?.avgUsFee}
                          fmt={fmtMoney}
                        />
                        <TrendRow
                          label="FX spread"
                          quarter={trend.quarter?.avgFxSpread}
                          year={trend.year?.avgFxSpread}
                          fmt={fmtPct}
                        />
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <p className="mt-6 text-sm text-slate-600">
                Want the per-broker detail behind these averages?{" "}
                <Link href="/compare" className="font-semibold text-blue-700 underline">
                  Compare every platform&rsquo;s fees
                </Link>{" "}
                or follow{" "}
                <Link href="/fee-tracker" className="font-semibold text-blue-700 underline">
                  every fee change as it happens
                </Link>
                .
              </p>
            </>
          ) : (
            // Honest empty state — never fabricate an index.
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h2 className="text-lg font-bold text-slate-700">
                The index is still gathering data
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                We publish the index once enough current fee snapshots are
                available. In the meantime, you can{" "}
                <Link href="/compare" className="font-semibold text-blue-700 underline">
                  compare platform fees directly
                </Link>
                .
              </p>
            </div>
          )}

          {/* Methodology */}
          <section
            aria-labelledby="methodology-heading"
            className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5"
          >
            <h2
              id="methodology-heading"
              className="text-base font-bold text-slate-900 md:text-lg"
            >
              Methodology
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <strong className="text-slate-800">Source.</strong> Every figure
                is computed from Invest.com.au&rsquo;s own broker fee snapshots —
                a timestamped capture of each active platform&rsquo;s published
                fees, recorded automatically. These are the same numbers shown on
                our comparison pages; we do not use third-party fee data.
              </li>
              <li>
                <strong className="text-slate-800">One vote per broker.</strong>{" "}
                We take the most recent snapshot for each active broker, so a
                platform captured several times is counted once.
              </li>
              <li>
                <strong className="text-slate-800">Averages.</strong> The
                headline figure is the simple <em>mean</em> across the brokers
                that quote a value for that fee. We publish the{" "}
                <em>median</em> alongside it as an outlier-resistant companion,
                plus the sample size so a thin day is visibly thin.
              </li>
              <li>
                <strong className="text-slate-800">What each metric means.</strong>{" "}
                ASX brokerage is the per-trade cost to buy or sell Australian
                shares; the US-share fee is the equivalent for US-listed shares;
                the FX spread is the currency conversion margin a platform
                charges, in percent. Fees quoted as a percentage or tiered are
                reduced to a single representative number for the average.
              </li>
              <li>
                <strong className="text-slate-800">Trend.</strong> QoQ and YoY
                compare the latest period against the nearest published index on
                or before three and twelve months earlier. A window shows
                &ldquo;no comparable data&rdquo; until enough history exists.
              </li>
              <li>
                <strong className="text-slate-800">Updates.</strong> The index is
                recomputed daily and this page refreshes hourly. Figures can
                change without notice as platforms update their pricing — always
                confirm the current fee with the platform before acting.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section className="mt-10 pt-8 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {BROKERAGE_FEE_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Compliance + E-E-A-T */}
          <div className="mt-8 space-y-3 text-[0.7rem] leading-relaxed text-slate-500 md:text-xs">
            <p>
              <strong className="text-slate-600">General information only.</strong>{" "}
              {GENERAL_ADVICE_WARNING}
            </p>
            <p>{EDITORIAL_ACCURACY_COMMITMENT}</p>
            <p>
              Compiled by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>{" "}
              from the platform&rsquo;s own fee snapshots.{" "}
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

import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = {
  title: `The Invest Score — Methodology | ${SITE_NAME}`,
  description:
    "How Invest.com.au computes The Invest Score — a daily composite of Australian market signals. Methodology, component weights, and compliance notes.",
  alternates: { canonical: "/methodology/invest-score" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Methodology", url: absoluteUrl("/methodology") },
  { name: "The Invest Score" },
]);

const COMPONENTS = [
  {
    name: "Rate Level",
    weight: "30%",
    source: "savings_rate_snapshots",
    description:
      "The average savings rate (in basis points) from the most recent daily snapshot of all products in our database. Higher rates indicate a stronger environment for deposit-based investing. Normalised to a 0–100 scale where 500 bps (5.00%) = score 100.",
  },
  {
    name: "Rate Momentum",
    weight: "25%",
    source: "rate_change_log",
    description:
      "The net change in rates (in basis points) across all products over the prior 30 calendar days. Positive net change (rate hikes) increases this component; negative net change (rate cuts) decreases it. A neutral score of 50 indicates no net change. Capped at ±50 points from neutral.",
  },
  {
    name: "Platform Activity",
    weight: "30%",
    source: "advisor_metrics_daily",
    description:
      "Advisor enquiry volume over the last 7 days compared to the 30-day baseline. Above-baseline activity indicates higher market participation and investor engagement. A score of 50 represents parity with the baseline; 100 represents double the baseline activity.",
  },
  {
    name: "Market Breadth",
    weight: "15%",
    source: "brokers (active status)",
    description:
      "The number of actively listed and promoted investing platforms in our directory. A broader, more competitive market is interpreted as a healthier investing landscape. 50 active brokers = score 100.",
  },
];

const LABELS = [
  { range: "0–24", label: "Very Cautious", meaning: "Market signals are subdued or declining across most components." },
  { range: "25–39", label: "Cautious", meaning: "Below-average conditions across the tracked signals." },
  { range: "40–54", label: "Neutral", meaning: "Mixed signals — some components positive, some negative." },
  { range: "55–69", label: "Constructive", meaning: "Above-average conditions across most tracked signals." },
  { range: "70–84", label: "Positive", meaning: "Strong conditions across the majority of tracked signals." },
  { range: "85–100", label: "Very Positive", meaning: "Near-peak conditions across all tracked signals." },
];

export default function InvestScoreMethodologyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="container-custom max-w-3xl py-10 md:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/methodology" className="hover:text-slate-600 transition-colors">Methodology</Link>
          <span>/</span>
          <span className="text-slate-600">The Invest Score</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
            The Invest Score — Methodology
          </h1>
          <p className="text-base md:text-lg text-slate-500 leading-relaxed">
            The Invest Score is a daily composite index of publicly observable Australian market
            signals tracked by Invest.com.au. It is a factual data summary — not a buy/sell
            signal, not investment advice, and not a prediction of future returns.
          </p>
        </div>

        {/* Compliance callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-amber-900 mb-1">Important disclosure</p>
          <p className="text-sm text-amber-800 leading-relaxed">
            The Invest Score is general information only. It does not constitute personal
            financial advice or a recommendation to buy, sell, or hold any investment product.
            It is a factual summary of observable signals in our database. Always consider your
            personal circumstances and consult a licensed financial adviser before making
            investment decisions.
          </p>
        </div>

        {/* Components */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">Score Components</h2>
        <div className="space-y-4 mb-10">
          {COMPONENTS.map((c) => (
            <div key={c.name} className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">{c.name}</h3>
                <span className="shrink-0 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                  {c.weight}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed mb-2">{c.description}</p>
              <p className="text-[11px] text-slate-400">
                Source: <code className="font-mono bg-slate-100 px-1 rounded">{c.source}</code>
              </p>
            </div>
          ))}
        </div>

        {/* Formula */}
        <h2 className="text-xl font-bold text-slate-900 mb-3">Composite Formula</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-10 font-mono text-xs md:text-sm text-slate-700 leading-loose">
          <p>Score = (Rate Level × 0.30)</p>
          <p className="pl-8">+ (Rate Momentum × 0.25)</p>
          <p className="pl-8">+ (Platform Activity × 0.30)</p>
          <p className="pl-8">+ (Market Breadth × 0.15)</p>
          <p className="mt-2 text-slate-500 font-sans text-xs">
            Each component is first normalised to a 0–100 scale. The composite score is rounded
            to two decimal places. All inputs default to 50 (neutral) when data is unavailable.
          </p>
        </div>

        {/* Labels */}
        <h2 className="text-xl font-bold text-slate-900 mb-3">Score Labels</h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-6">Range</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-6">Label</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">What it means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LABELS.map((row) => (
                <tr key={row.range}>
                  <td className="py-2.5 pr-6 font-mono text-xs font-semibold text-slate-700">{row.range}</td>
                  <td className="py-2.5 pr-6 font-semibold text-slate-800 whitespace-nowrap">{row.label}</td>
                  <td className="py-2.5 text-xs text-slate-500 leading-relaxed">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Update cadence */}
        <h2 className="text-xl font-bold text-slate-900 mb-3">Update Cadence</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-10">
          The Invest Score is recomputed once per day by an automated job that runs alongside our
          daily savings-rate snapshot refresh. The homepage gauge is refreshed every hour. If the
          daily job has not yet run for the current day, the previous day&apos;s score is shown.
        </p>

        {/* Limitations */}
        <h2 className="text-xl font-bold text-slate-900 mb-3">Limitations</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-500 mb-10">
          <li>The score reflects only signals observable in our database — it does not incorporate ASX index data, RBA cash rate decisions, or macroeconomic indicators.</li>
          <li>Platform activity (advisor enquiry volume) is a proxy for investor engagement, not a direct measure of market returns or volatility.</li>
          <li>The score is a lagging indicator — it reflects conditions observable from data we have already collected, not real-time market prices.</li>
          <li>All weights were set editorially and may be adjusted as our data coverage grows.</li>
        </ul>

        {/* Footer links */}
        <div className="border-t border-slate-200 pt-6 flex flex-wrap gap-4 text-sm">
          <Link href="/methodology" className="text-blue-700 hover:underline">
            ← Full ranking methodology
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            Back to homepage
          </Link>
        </div>
      </div>
    </>
  );
}

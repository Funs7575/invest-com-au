import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING, RISK_WARNING_CTA } from "@/lib/compliance";
import {
  getFeeBenchmark,
  formatCentsAUD,
  labelForBudgetBand,
  labelForQuoteType,
  FEE_BENCHMARK_MIN_SAMPLE,
  type FeeBenchmark,
  type BenchmarkCell,
} from "@/lib/fee-benchmark";
import { QUOTE_ADVISOR_TYPES, QUOTE_AU_STATES } from "@/lib/api-schemas";
import { logger } from "@/lib/logger";
import Icon from "@/components/Icon";

export const revalidate = 3600;

const log = logger("advice-fees-page");

export const metadata: Metadata = {
  title: `Advice & Adviser Fees in Australia (${CURRENT_YEAR}): Real Quote Benchmarks`,
  description:
    `What financial advisers, SMSF accountants, mortgage brokers and buyers agents actually quote in ${CURRENT_YEAR} — ` +
    "medians and typical ranges by service type and state, from real quotes on the Invest.com.au marketplace.",
  alternates: { canonical: `${SITE_URL}/advice-fees` },
};

const FAQS = [
  {
    q: "How are these fee benchmarks calculated?",
    a:
      "Every figure on this page is derived from real quotes submitted by verified advisers on the Invest.com.au quote marketplace over the last 12 months. For each service type and state we publish the median quote and the typical range (the middle 50% of quotes, from the 25th to the 75th percentile). Figures are aggregates only — no individual quote, adviser, or consumer is identifiable.",
  },
  {
    q: "Why do some cells say 'not enough data yet'?",
    a:
      `We suppress any service-type and state combination with fewer than ${FEE_BENCHMARK_MIN_SAMPLE} quotes. Below that threshold a median is statistically meaningless and could be skewed by a single quote, so we show nothing rather than a misleading number. Cells unlock automatically as more quotes are submitted.`,
  },
  {
    q: "Is a cheaper quote a better deal?",
    a:
      "Not necessarily. These benchmarks describe what the market charges — they say nothing about the quality, scope, or fit of any individual service. A higher quote may include more work, more experience, or a broader scope; a lower quote may be narrower. The information on this page is general in nature and is not a recommendation to choose any price point or provider.",
  },
  {
    q: "Where does the data come from and how fresh is it?",
    a:
      "The data comes directly from the Invest.com.au quote marketplace, where consumers post requests and verified advisers respond with quotes. Benchmarks cover the last 12 months of accepted and live quotes on public requests, refresh hourly, and each service type shows the date of its most recent quote.",
  },
];

const faqLd = faqJsonLd(FAQS);

function monthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-AU", { month: "short", year: "numeric" }).format(d);
}

function CellValue({ cell }: { cell: BenchmarkCell | undefined }) {
  if (!cell) {
    return <span className="text-[11px] text-slate-500">Not enough data yet</span>;
  }
  return (
    <span className="inline-flex flex-col">
      <span className="font-bold text-slate-900">{formatCentsAUD(cell.medianCents)}</span>
      <span className="text-[11px] text-slate-500">
        {formatCentsAUD(cell.p25Cents)}–{formatCentsAUD(cell.p75Cents)} · n={cell.count}
      </span>
    </span>
  );
}

export default async function AdviceFeesPage() {
  let benchmark: FeeBenchmark | null = null;
  try {
    benchmark = await getFeeBenchmark();
  } catch (err) {
    log.error("Failed to load fee benchmark", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const types = benchmark?.types ?? [];
  const consultations = benchmark?.consultations ?? [];
  const includedQuotes = types.reduce((sum, t) => sum + t.national.count, 0);
  const accumulating = QUOTE_ADVISOR_TYPES.filter(
    (t) => !types.some((row) => row.type === t),
  ).map((t) => labelForQuoteType(t));

  const top = types.slice(0, 3);
  const answerParagraph =
    top.length > 0
      ? `Based on ${includedQuotes.toLocaleString("en-AU")} real quotes submitted by verified advisers on the ` +
        `Invest.com.au marketplace over the last 12 months, ${top
          .map(
            (t) =>
              `the median ${t.label} engagement is quoted at ${formatCentsAUD(t.national.medianCents)} ` +
              `(typical range ${formatCentsAUD(t.national.p25Cents)}–${formatCentsAUD(t.national.p75Cents)})`,
          )
          .join(", ")}. The full type-by-state benchmark is below — every figure is a median of real quotes, not a survey or an estimate.`
      : "This page publishes medians and typical ranges of real quotes submitted by verified advisers on the Invest.com.au marketplace. Benchmarks for each service type unlock once " +
        `${FEE_BENCHMARK_MIN_SAMPLE} or more quotes have been submitted in the last 12 months — quotes are accumulating now, so check back soon.`;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Quotes", url: `${SITE_URL}/quotes` },
    { name: "Advice fees" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* Hero — answer first */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
            <Icon name="bar-chart" size={13} aria-hidden="true" />
            Real quote data · {UPDATED_LABEL}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-4">
            What does financial advice actually cost in Australia?
          </h1>
          <p className="text-slate-200 max-w-3xl text-sm sm:text-base leading-relaxed">{answerParagraph}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/quotes/post"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl"
            >
              Get quotes for your situation
              <Icon name="arrow-right" size={14} aria-hidden="true" />
            </Link>
            <Link href="/quotes/recent-wins" className="text-sm text-slate-200 underline hover:text-white">
              See recent accepted quotes
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-300 max-w-xl">{RISK_WARNING_CTA}</p>
        </div>
      </section>

      {/* Benchmark matrix */}
      <section className="bg-slate-50 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
            Median quote by service type and state
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-3xl">
            Median and typical range (middle 50% of quotes) over the last 12 months. Cells with fewer
            than {FEE_BENCHMARK_MIN_SAMPLE} quotes are suppressed and shown as &ldquo;not enough data
            yet&rdquo; — we never publish a figure a single quote could skew.
          </p>

          {types.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <Icon name="bar-chart" size={24} className="text-slate-500 mx-auto mb-2" aria-hidden="true" />
              <p className="font-bold text-slate-900 mb-1">Benchmarks are accumulating</p>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                We publish a benchmark once a service type reaches {FEE_BENCHMARK_MIN_SAMPLE} quotes in
                the last 12 months. Post a request to add to the corpus — and get real quotes for your
                own situation while you&rsquo;re at it.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop matrix */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Median adviser quote by service type and Australian state or territory
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold text-slate-700">
                        Service type
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-slate-700">
                        National
                      </th>
                      {QUOTE_AU_STATES.map((s) => (
                        <th scope="col" key={s} className="px-4 py-3 font-semibold text-slate-700">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((row) => (
                      <tr key={row.type} className="border-b border-slate-100 last:border-0 align-top">
                        <th scope="row" className="px-4 py-3 text-left font-semibold text-slate-900">
                          {row.label}
                          <span className="block text-[11px] font-normal text-slate-500">
                            Latest quote {monthYear(row.national.latestQuoteAt)}
                          </span>
                          {row.topBudgetBand && (
                            <span className="block text-[11px] font-normal text-slate-500">
                              Most common stated budget: {labelForBudgetBand(row.topBudgetBand)}
                            </span>
                          )}
                        </th>
                        <td className="px-4 py-3">
                          <CellValue cell={row.national} />
                        </td>
                        {QUOTE_AU_STATES.map((s) => (
                          <td key={s} className="px-4 py-3">
                            <CellValue cell={row.byState[s]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-4">
                {types.map((row) => {
                  const statesWithData = QUOTE_AU_STATES.filter((s) => row.byState[s]);
                  return (
                    <div key={row.type} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">{row.label}</h3>
                          <p className="text-[11px] text-slate-500">
                            Latest quote {monthYear(row.national.latestQuoteAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-extrabold text-slate-900">
                            {formatCentsAUD(row.national.medianCents)}
                          </p>
                          <p className="text-[11px] text-slate-500">national median</p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Typical range {formatCentsAUD(row.national.p25Cents)}–
                        {formatCentsAUD(row.national.p75Cents)} across {row.national.count} quotes.
                        {row.topBudgetBand &&
                          ` Most common stated budget: ${labelForBudgetBand(row.topBudgetBand)}.`}
                      </p>
                      {statesWithData.length > 0 && (
                        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                          {statesWithData.map((s) => {
                            const cell = row.byState[s];
                            if (!cell) return null;
                            return (
                              <div key={s} className="flex items-baseline justify-between gap-2">
                                <dt className="font-semibold text-slate-700">{s}</dt>
                                <dd className="text-slate-600">
                                  <span className="font-bold text-slate-900">
                                    {formatCentsAUD(cell.medianCents)}
                                  </span>{" "}
                                  ({formatCentsAUD(cell.p25Cents)}–{formatCentsAUD(cell.p75Cents)}, n=
                                  {cell.count})
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                      <p className="mt-2 text-[11px] text-slate-500">
                        {statesWithData.length === QUOTE_AU_STATES.length
                          ? ""
                          : statesWithData.length > 0
                            ? "Other states: not enough data yet."
                            : "State-level figures: not enough data yet."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {accumulating.length > 0 && types.length > 0 && (
            <p className="mt-4 text-xs text-slate-600 max-w-3xl">
              Still accumulating quotes (no benchmark yet): {accumulating.join(", ")}.
            </p>
          )}
        </div>
      </section>

      {/* One-off consultations — separate price class */}
      {consultations.length > 0 && (
        <section className="bg-white py-10 border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
              One-off consultation sessions
            </h2>
            <p className="text-sm text-slate-600 mb-5 max-w-3xl">
              Fixed-price single sessions listed on the marketplace — a different price class from the
              engagement quotes above, so they are benchmarked separately (national only).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {consultations.map((c) => (
                <div key={c.category} className="border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-slate-900">{c.label}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">
                    {formatCentsAUD(c.medianCents)}
                    <span className="text-xs font-normal text-slate-500"> median</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Typical range {formatCentsAUD(c.p25Cents)}–{formatCentsAUD(c.p75Cents)} · n={c.count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Methodology + compliance */}
      <section className="bg-slate-50 py-10 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <Icon name="info" size={15} className="text-slate-500" aria-hidden="true" />
              Methodology
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              These benchmarks are derived from real quotes on this marketplace — accepted and live
              quotes submitted by verified advisers on public quote requests in the last 12 months —
              not from surveys or estimates. Each cell shows the median and the middle 50% of quotes
              (25th–75th percentile). Any service-type and state combination with fewer than{" "}
              {FEE_BENCHMARK_MIN_SAMPLE} quotes is suppressed. Figures describe market pricing only;
              they are not personal advice and not a recommendation of any price point or provider.
            </p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                  ▾
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

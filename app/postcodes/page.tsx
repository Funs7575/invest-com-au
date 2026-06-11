import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  postcodeAtlasMeta,
  topPostcodesByIncome,
  postcodeStateCounts,
} from "@/lib/postcode-atlas";
import PostcodeSearch from "./PostcodeSearch";

export const revalidate = 86400;

const meta = postcodeAtlasMeta();

export const metadata: Metadata = {
  title: `Postcode Wealth Atlas (${CURRENT_YEAR}) — Income & Super by Australian Postcode`,
  description:
    "Median taxable income, average income and super contributions for every Australian postcode — straight from the ATO's taxation statistics, searchable by suburb or postcode.",
  alternates: { canonical: absoluteUrl("/postcodes") },
  ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
};

const FAQS = [
  {
    question: "Where do these income figures come from?",
    answer:
      "From the ATO's annual taxation statistics, which report taxable income and contribution figures aggregated by postcode from lodged tax returns. They reflect taxpayers who lodged for the income year shown — not every resident.",
  },
  {
    question: "Why is median income more useful than average?",
    answer:
      "A handful of very high earners pulls the average up; the median is the middle taxpayer and better reflects a typical income in the postcode. Where both are shown, a big gap between them signals a wide income spread.",
  },
  {
    question: "Does a wealthy postcode mean I should invest there?",
    answer:
      "No — these are factual income statistics, not an investment signal. Property returns, rental yields, and growth depend on supply, infrastructure, and price already paid. Use the data as context, not advice.",
  },
];

export default function PostcodesHubPage() {
  const top = topPostcodesByIncome(10);
  const states = postcodeStateCounts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Postcode Wealth Atlas", url: absoluteUrl("/postcodes") },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS.map((f) => ({ q: f.question, a: f.answer })))} />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "ATO taxation statistics by postcode — atlas index",
            description:
              "Median and average taxable income and super contributions by Australian postcode.",
            url: absoluteUrl("/postcodes"),
            dateModified: meta.extractedAt,
            temporalCoverage: meta.incomeYear,
            creator: { "@type": "Organization", name: SITE_NAME },
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Postcode Wealth Atlas</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview dataset.</strong> These postcodes are
            synthetic placeholders (reserved 99xx codes, fictional suburbs) while the ATO extract
            is loaded (<code className="text-xs">npm run data:postcodes</code>). No figure refers
            to a real place yet, and these pages are excluded from search engines.
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          What does your postcode earn?
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-2">
          Median taxable income, average income and super contributions for{" "}
          {meta.sample ? "every" : `${meta.count.toLocaleString("en-AU")}`} Australian postcodes —
          straight from the ATO&apos;s taxation statistics.
        </p>
        <p className="text-xs text-slate-500 mb-8">
          Income year: <span className="font-medium text-slate-700">{meta.incomeYear}</span> ·
          extract dated <time dateTime={meta.extractedAt}>{meta.extractedAt}</time>
        </p>

        <PostcodeSearch />

        {/* Top by median income */}
        {top.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">
              Highest median taxable incomes
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              As reported for {meta.incomeYear} — a factual list, not a recommendation of anywhere.
            </p>
            <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {top.map((p, i) => (
                <li key={p.postcode}>
                  <Link
                    href={`/postcodes/${p.postcode}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
                  >
                    <span className="min-w-0 flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 tabular-nums w-5">{i + 1}</span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {p.postcode} · {p.suburbs[0] ?? p.state}
                        </span>
                        <span className="block text-xs text-slate-500">{p.state}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-slate-800 tabular-nums">
                      ${(p.medianTaxableIncome ?? 0).toLocaleString("en-AU")}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* States */}
        {states.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">Coverage by state</h2>
            <div className="flex flex-wrap gap-1.5">
              {states.map((s) => (
                <span key={s.state} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {s.state} <span className="text-slate-400">· {s.count}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Adviser cross-link */}
        <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Icon name="users" size={16} className="text-emerald-600" />
            Numbers are context — plans are personal
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            Whatever your postcode earns, what matters is your own plan: contributions, buffers,
            and what you&apos;re building toward.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/find-advisor"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Find an adviser near you
            </Link>
            <Link
              href="/super/funds"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Compare super fund performance
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12 space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Common questions</h2>
          {FAQS.map((f) => (
            <div key={f.question}>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{f.question}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </section>

        {/* Methodology */}
        <section className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">About this data</p>
          <p>
            Figures come from the ATO&apos;s annual taxation statistics (postcode tables) for the
            income year shown, published as open data. Aggregates reflect lodged individual tax
            returns. This is factual information, not financial or property advice.
          </p>
        </section>

        <div className="mt-10">
          <ComplianceFooter />
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { PAST_PERFORMANCE_WARNING, SUPER_WARNING } from "@/lib/compliance";
import { allSuperFunds, fundTypeCounts, superFundsMeta } from "@/lib/super-funds";
import SuperFundsExplorer from "./SuperFundsExplorer";

export const revalidate = 86400;

const meta = superFundsMeta();

export const metadata: Metadata = {
  title: `Super Fund Performance Explorer (${CURRENT_YEAR}) — APRA Returns, Fees & Size`,
  description:
    "Compare every APRA-regulated super fund's reported 5 and 10-year returns, operating expenses, assets and member numbers — sortable, free, no signup.",
  alternates: { canonical: absoluteUrl("/super/funds") },
  ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
};

const FAQS = [
  {
    question: "Where does this performance data come from?",
    answer:
      "From APRA's published annual fund-level superannuation statistics — the regulator's own dataset covering every APRA-regulated fund. Figures are fund-level net rates of return after fees and taxes, for the reporting period shown above.",
  },
  {
    question: "Why does my investment option's return look different?",
    answer:
      "These are whole-of-fund returns. Your balance sits in a specific investment option (like Growth or Balanced) whose return can differ significantly from the fund-level figure. Check your fund's statement or the ATO's YourSuper tool for option-level numbers.",
  },
  {
    question: "Is a higher 10-year return always better?",
    answer:
      "No. Returns reflect each fund's investment mix and risk level, not skill alone — a growth-heavy fund should beat a conservative one over a decade but will fall harder in bad years. Compare funds with similar risk profiles, and look at fees too: they compound just like returns.",
  },
];

export default function SuperFundsPage() {
  const funds = allSuperFunds();
  const types = fundTypeCounts().map((t) => t.type);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Super", url: absoluteUrl("/super") },
          { name: "Fund Explorer", url: absoluteUrl("/super/funds") },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS.map((f) => ({ q: f.question, a: f.answer })))} />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "APRA fund-level superannuation statistics — explorer index",
            description:
              "Reported returns, expenses, assets and member numbers for APRA-regulated superannuation funds.",
            url: absoluteUrl("/super/funds"),
            dateModified: meta.extractedAt,
            temporalCoverage: meta.period,
            isBasedOn: "https://www.apra.gov.au/annual-fund-level-superannuation-statistics",
            creator: { "@type": "Organization", name: SITE_NAME },
          }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/super" className="hover:text-slate-700 transition-colors">Super</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Fund Explorer</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview dataset.</strong> These funds are synthetic
            placeholders while the APRA extract is loaded
            (<code className="text-xs">npm run data:apra</code>). No figure on these pages refers
            to a real fund yet, and they are excluded from search engines.
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          Super fund performance, side by side
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-2 max-w-2xl">
          Reported returns, operating expenses, assets and member numbers for{" "}
          {meta.sample ? "" : `${meta.count.toLocaleString("en-AU")} `}APRA-regulated super funds —
          straight from the regulator&apos;s fund-level statistics, sortable any way you like.
        </p>
        <p className="text-xs text-slate-500 mb-8">
          Reporting period: <span className="font-medium text-slate-700">{meta.period}</span> · extract
          dated <time dateTime={meta.extractedAt}>{meta.extractedAt}</time>
        </p>

        <SuperFundsExplorer funds={funds} types={types} />

        {/* Past performance + switching warnings */}
        <div className="mt-6 space-y-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1">Before you read too much into returns</p>
            <p>{PAST_PERFORMANCE_WARNING}</p>
          </div>
          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 text-xs text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-1">Thinking of switching?</p>
            <p>{SUPER_WARNING}</p>
          </div>
        </div>

        {/* Cross-links */}
        <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Icon name="trending-up" size={16} className="text-emerald-600" />
            Turn the numbers into a decision
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            The data tells you what each fund reported — not which suits your age, risk appetite,
            or insurance needs. These help with that part:
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
            <Link
              href="/super/compare-guide"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              How to compare funds properly
            </Link>
            <Link
              href="/compare/super"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Compare super platforms
            </Link>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Talk to a financial planner
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
            Figures come from APRA&apos;s{" "}
            <a
              href="https://www.apra.gov.au/annual-fund-level-superannuation-statistics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline hover:text-amber-800"
            >
              annual fund-level superannuation statistics
            </a>{" "}
            for the period shown above. Returns are whole-of-fund net rates of return; expenses are
            operating expense ratios. We display the regulator&apos;s reported figures without
            adjustment — this is factual information, not a rating, ranking, or recommendation. For
            option-level comparisons use the ATO&apos;s{" "}
            <a
              href="https://www.ato.gov.au/calculators-and-tools/super-yoursuper-comparison-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline hover:text-amber-800"
            >
              YourSuper comparison tool
            </a>
            .
          </p>
        </section>

        <div className="mt-10">
          <ComplianceFooter />
        </div>
      </div>
    </div>
  );
}

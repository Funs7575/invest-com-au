import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  ghostTickersMeta,
  recentGhostTickers,
  ghostTickerYearCounts,
  GHOST_EVENT_LABELS,
} from "@/lib/ghost-tickers";
import DelistedSearch from "./DelistedSearch";

export const revalidate = 86400;

const meta = ghostTickersMeta();

export const metadata: Metadata = {
  title: `Delisted ASX Companies Lookup (${CURRENT_YEAR}) — What Happened to That Ticker?`,
  description:
    "Search every company removed from the ASX: delistings, takeovers, mergers, renames and failures — what happened, when, and what it means for old shareholdings.",
  alternates: { canonical: absoluteUrl("/asx/delisted") },
  ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
};

const FAQS = [
  {
    question: "What happens to my shares when a company is delisted?",
    answer:
      "It depends on why it left the list. In a takeover or scheme of arrangement you generally received cash or shares in the acquirer at the time. If the company failed, the shares are usually worthless once liquidation completes — which can at least crystallise a capital loss. If it delisted voluntarily but kept trading as an unlisted company, you may still own the shares; transferring them just gets harder.",
  },
  {
    question: "How do I find money from an old shareholding?",
    answer:
      "Start with the share registry the company used (Computershare, MUFG/Link, Automic), then search ASIC's unclaimed money register on MoneySmart — takeover proceeds that never reached shareholders often end up there.",
  },
  {
    question: "Can I claim a capital loss on a failed company?",
    answer:
      "Generally only once the loss is crystallised — for example, a liquidator declares the shares worthless or the company is deregistered. The declaration date matters for which tax year the loss falls in. This is general information; a tax adviser can confirm your specific position.",
  },
];

export default function DelistedHubPage() {
  const recent = recentGhostTickers(12);
  const years = ghostTickerYearCounts().slice(0, 12);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "ASX", url: absoluteUrl("/asx/delisted") },
          { name: "Delisted companies", url: absoluteUrl("/asx/delisted") },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS.map((f) => ({ q: f.question, a: f.answer })))} />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "ASX removed companies — lookup index",
            description:
              "Companies removed from the Australian Securities Exchange official list: delistings, takeovers, mergers, renames and failures.",
            url: absoluteUrl("/asx/delisted"),
            dateModified: meta.extractedAt,
            creator: { "@type": "Organization", name: SITE_NAME },
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Delisted ASX companies</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview dataset.</strong> These companies are
            synthetic placeholders while the ASX extract is loaded
            (<code className="text-xs">npm run data:asx-removed</code>). Nothing here refers to a
            real company yet, and these pages are excluded from search engines.
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          What happened to that ASX company?
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8">
          Look up {meta.sample ? "any" : `${meta.count.toLocaleString("en-AU")}`} companies removed
          from the ASX — taken over, merged, renamed, failed, or quietly delisted — and what each
          exit means for old shareholdings. Extract dated{" "}
          <time dateTime={meta.extractedAt} className="font-medium text-slate-700">{meta.extractedAt}</time>.
        </p>

        <DelistedSearch />

        {/* Recent removals */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent removals</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {recent.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/asx/delisted/${t.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">
                      <span className="font-mono text-amber-700">{t.code}</span> · {t.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {GHOST_EVENT_LABELS[t.event]} · {t.eventDate}
                    </span>
                  </span>
                  <Icon name="arrow-right" size={14} className="text-slate-400 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* By year */}
        {years.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">Removals by year</h2>
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <span key={y.year} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {y.year} <span className="text-slate-400">· {y.count}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Old shareholding helper */}
        <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Icon name="search" size={16} className="text-emerald-600" />
            Holding shares in a company that vanished?
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            Takeover proceeds that never reached you often sit in ASIC&apos;s unclaimed money
            register, and crystallised losses can matter at tax time.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
            <a
              href="https://moneysmart.gov.au/find-unclaimed-money"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Search unclaimed money (MoneySmart)
            </a>
            <Link
              href="/cgt-calculator"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Work out the capital-gains impact
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
            Records come from the ASX&apos;s published removed-companies information, with the
            exchange&apos;s stated reason shown verbatim on each page. This is factual market
            history, not advice — for live company announcements check asx.com.au, and for tax or
            recovery questions consider a licensed professional via our{" "}
            <Link href="/advisors" className="text-amber-700 underline hover:text-amber-800">adviser directory</Link>.
          </p>
        </section>

        <div className="mt-10">
          <ComplianceFooter />
        </div>
      </div>
    </div>
  );
}

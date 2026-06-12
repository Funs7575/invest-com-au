import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  ghostTickerBySlug,
  sameYearGhostTickers,
  ghostTickersMeta,
  GHOST_EVENT_LABELS,
  type GhostTicker,
} from "@/lib/ghost-tickers";

export const revalidate = 86400;
// On-demand ISR over the file-backed extract, same as the other registries.
export function generateStaticParams() {
  return [];
}

const meta = ghostTickersMeta();

const EVENT_EXPLAINERS: Record<GhostTicker["event"], string> = {
  delisted:
    "A voluntary or administrative delisting removes the shares from ASX trading but doesn't itself destroy ownership — the company may continue as an unlisted entity, where shares are harder to value and transfer.",
  renamed:
    "A renamed company keeps trading under its new code — existing holdings carry over automatically, and your broker statement should show the new name.",
  merged:
    "In a merger by scheme of arrangement, shareholders generally received shares in the merged entity, cash, or a mix, on the implementation date.",
  acquired:
    "In a takeover or compulsory acquisition, shareholders generally received the offer consideration (cash and/or scrip). Unclaimed proceeds are typically remitted to ASIC's unclaimed money register.",
  failed:
    "When a company fails, shares usually become worthless once liquidation or deregistration completes — at which point a capital loss can generally be crystallised for tax purposes.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ticker = ghostTickerBySlug(slug);
  if (!ticker) notFound();
  const year = ticker.eventDate.slice(0, 4);
  return {
    title: `${ticker.code} — What Happened to ${ticker.name}? (${GHOST_EVENT_LABELS[ticker.event]} ${year})`,
    description: `${ticker.name} (ASX: ${ticker.code}) was removed from the ASX on ${ticker.eventDate} — ${GHOST_EVENT_LABELS[ticker.event].toLowerCase()}. The exchange's stated reason, and what it means for old shareholdings.`,
    alternates: { canonical: absoluteUrl(`/asx/delisted/${ticker.slug}`) },
    ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function GhostTickerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ticker: GhostTicker | null = ghostTickerBySlug(slug);
  if (!ticker) notFound();

  const peers = sameYearGhostTickers(ticker);
  const year = ticker.eventDate.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Delisted ASX companies", url: absoluteUrl("/asx/delisted") },
          { name: `${ticker.code} — ${ticker.name}`, url: absoluteUrl(`/asx/delisted/${ticker.slug}`) },
        ])}
      />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Corporation",
            name: ticker.name,
            tickerSymbol: `ASX:${ticker.code}`,
            dissolutionDate: ticker.eventDate,
            url: absoluteUrl(`/asx/delisted/${ticker.slug}`),
          }}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/asx/delisted" className="hover:text-slate-700 transition-colors">Delisted companies</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">{ticker.code}</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview record.</strong> This is a synthetic
            placeholder, not a real company — the ASX extract hasn&apos;t been loaded yet.
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <span className="font-mono text-sm font-bold text-slate-500">{ticker.code}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">{ticker.name}</h1>
            <p className="text-sm font-semibold text-amber-700 mt-0.5">
              {GHOST_EVENT_LABELS[ticker.event]} · {year}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Formerly ASX: <span className="font-mono font-semibold">{ticker.code}</span> · removed{" "}
              <time dateTime={ticker.eventDate}>{ticker.eventDate}</time>
            </p>
          </div>
        </div>

        {/* What happened */}
        <section aria-labelledby="what-happened" className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
          <h2 id="what-happened" className="text-sm font-bold text-slate-900 mb-2">What happened</h2>
          {ticker.detail && (
            <blockquote className="border-l-2 border-amber-300 pl-3 text-sm text-slate-700 leading-relaxed mb-3">
              &ldquo;{ticker.detail}&rdquo;
              <span className="block mt-1 text-[0.7rem] text-slate-500 not-italic">— exchange&apos;s stated reason</span>
            </blockquote>
          )}
          <p className="text-sm text-slate-600 leading-relaxed">{EVENT_EXPLAINERS[ticker.event]}</p>
          {ticker.successorName && (
            <p className="mt-3 text-sm text-slate-700">
              <Icon name="arrow-right" size={13} className="inline text-amber-600 mr-1" />
              Continued as <span className="font-semibold">{ticker.successorName}</span>
              {ticker.successorCode && (
                <>
                  {" "}
                  (ASX: <span className="font-mono font-semibold">{ticker.successorCode}</span>)
                </>
              )}
            </p>
          )}
          <p className="mt-4 text-[0.7rem] leading-relaxed text-slate-500">
            Source: ASX removed-companies information, extract dated {meta.extractedAt}. Factual
            market history, not advice — verify current details on asx.com.au.
          </p>
        </section>

        {/* Old shareholding guidance */}
        <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-1.5">Held shares in {ticker.name}?</h2>
          <ul className="text-sm text-slate-700 leading-relaxed space-y-2 mb-3.5">
            <li className="flex gap-2">
              <Icon name="check" size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              Check ASIC&apos;s unclaimed money register — takeover and buy-back proceeds that never
              reached shareholders end up there.
            </li>
            <li className="flex gap-2">
              <Icon name="check" size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              Contact the company&apos;s share registry (Computershare, MUFG, or Automic) with your
              old SRN/HIN for the holding history.
            </li>
            <li className="flex gap-2">
              <Icon name="check" size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              A crystallised loss may be usable against capital gains — timing rules apply.
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
            <a
              href="https://moneysmart.gov.au/find-unclaimed-money"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-bold text-slate-900 transition-colors shadow-sm"
            >
              Search unclaimed money
            </a>
            <Link
              href="/cgt-calculator"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              CGT calculator
            </Link>
          </div>
        </section>

        {/* Same-year removals */}
        {peers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">Also removed in {year}</h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {peers.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/asx/delisted/${p.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      <span className="font-mono text-amber-700">{p.code}</span> · {p.name}
                    </span>
                    <span className="text-xs text-slate-500">{GHOST_EVENT_LABELS[p.event]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Cross-link */}
        <section className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed mb-8">
          Trading today?{" "}
          <Link href="/share-trading" className="font-semibold text-amber-700 underline hover:text-amber-800">
            Compare share trading platforms
          </Link>{" "}
          or look up another company on the{" "}
          <Link href="/asx/delisted" className="font-semibold text-amber-700 underline hover:text-amber-800">
            delisted companies register
          </Link>
          .
        </section>

        <ComplianceFooter />
      </div>
    </div>
  );
}

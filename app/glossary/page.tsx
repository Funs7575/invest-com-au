import Link from "next/link";
import type { Metadata } from "next";
import type { GlossaryEntry } from "@/lib/glossary";
import { getGlossaryEntries } from "@/lib/glossary-db";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { definedTermSetJsonLd, faqJsonLd } from "@/lib/schema-markup";
import GlossarySearch from "@/components/GlossarySearch";

const GLOSSARY_FAQS = [
  {
    q: "Does this glossary cover Australian-specific investing terms?",
    a: "Yes. All definitions are written for the Australian market. The glossary covers ASX-specific concepts (CHESS sponsorship, franking credits, DRP), Australian tax rules (CGT discount, capital works deductions, SMSF), ASIC-regulated product types, and Australian superannuation terminology. When a term has different meaning or application in Australia versus the US or UK (e.g. 'franking credits' don't exist in most other countries), we explain the Australian context specifically.",
  },
  {
    q: "What investing categories are covered in the glossary?",
    a: "The glossary covers terms across all major Australian investing categories: general investing concepts, fees and costs, share trading (ASX and international), investment strategy, tax (CGT, franking credits, negative gearing), regulatory terms (ASIC, AFSL, RG 146), superannuation and SMSF, cryptocurrency, CFD and forex trading, robo-advisors, and property investing. Each term is tagged with its category so you can filter or browse by topic.",
  },
  {
    q: "How often is the glossary updated?",
    a: "The glossary is reviewed and updated as regulatory, tax, and market terminology evolves. ASIC and ATO guidance changes periodically — particularly around superannuation contribution caps, tax thresholds, and new financial product categories. Definitions are checked at least annually; terms affected by regulatory changes are updated within 30 days of the change taking effect. New terms are added continuously as the site covers emerging investing topics (e.g. tokenised assets, sustainable finance).",
  },
  {
    q: "Can I link to a specific glossary term from my website?",
    a: "Yes. Every term has its own URL at /glossary/[term-slug] (e.g. /glossary/franking-credits). These pages are canonical and stable — we don't change term slugs once published. Each term page also includes Schema.org DefinedTerm structured data, making the definition citable by search engines and AI answer systems. If a term you want to link to is not yet in the glossary, contact us at editorial@invest.com.au.",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Investing Glossary — Plain-English Definitions",
  description:
    "A-Z glossary of Australian investing terms in plain English. Shares, ETFs, super, crypto, CFDs, property & more.",
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "Investing Glossary",
    description:
      "Plain-English definitions of Australian investing terms — shares, super, crypto, CFDs, property, robo-advisors & more.",
    url: "/glossary",
    images: [
      {
        url: "/api/og?title=Investing+Glossary&subtitle=Plain-English+Definitions+for+Australian+Investors&type=default",
        width: 1200,
        height: 630,
        alt: "Investing Glossary",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

/** Group entries by first letter for A-Z navigation */
function groupByLetter(entries: GlossaryEntry[]) {
  const groups: Record<string, GlossaryEntry[]> = {};
  for (const entry of entries) {
    const letter = entry.term[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(entry);
  }
  // Sort entries within each letter group
  for (const letter of Object.keys(groups)) {
    groups[letter].sort((a, b) => a.term.localeCompare(b.term));
  }
  return groups;
}

/** Get all unique categories */
function getCategories(entries: GlossaryEntry[]): string[] {
  const cats = new Set<string>();
  for (const entry of entries) {
    if (entry.category) cats.add(entry.category);
  }
  return Array.from(cats).sort();
}

const CATEGORY_ICONS: Record<string, string> = {
  General: "\uD83D\uDCCA",
  Fees: "\uD83D\uDCB0",
  "Share Trading": "\uD83D\uDCC8",
  Strategy: "\uD83C\uDFAF",
  Tax: "\uD83E\uDDFE",
  Regulatory: "\uD83C\uDFDB\uFE0F",
  Super: "\uD83C\uDFE6",
  Crypto: "\u20BF",
  "CFD & Forex": "\u26A0\uFE0F",
  "Robo-Advisors": "\uD83E\uDD16",
  Property: "\uD83C\uDFE0",
};

export default async function GlossaryPage() {
  const entries = await getGlossaryEntries();
  const grouped = groupByLetter(entries);
  const letters = Object.keys(grouped).sort();
  const categories = getCategories(entries);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Glossary" },
  ]);

  // DefinedTermSet — names the whole glossary corpus and lists every term with
  // its own URL so AI systems cite one comprehensive AU-finance source.
  const glossaryJsonLd = definedTermSetJsonLd({
    description:
      "Plain-English definitions of financial and investing terms for Australian investors.",
    terms: entries,
  });

  const faqLd = faqJsonLd(GLOSSARY_FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryJsonLd) }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-600 mb-4 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Glossary</span>
          </nav>

          {/* Header */}
          <div className="mb-6 md:mb-10">
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 md:mb-3">
              Investing Glossary
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl">
              Plain-English definitions for {entries.length} investing
              terms. No jargon, no fluff — just what you need to know.
            </p>
          </div>

          {/* Search */}
          <GlossarySearch entries={entries} />

          {/* A-Z Quick Jump */}
          <div className="flex flex-wrap gap-1 md:gap-1.5 mb-6 md:mb-8 sticky top-0 bg-white/95 backdrop-blur-sm py-2 -mx-1 px-1 z-10 border-b border-slate-100">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-900 hover:text-white transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>

          {/* Category Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 mb-8 md:mb-12">
            {categories.map((cat) => {
              const count = entries.filter(
                (e) => e.category === cat
              ).length;
              return (
                <div
                  key={cat}
                  className="bg-slate-50 rounded-lg p-2.5 md:p-3 border border-slate-100"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm md:text-base">
                      {CATEGORY_ICONS[cat] || "\uD83D\uDCD6"}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-slate-800">
                      {cat}
                    </span>
                  </div>
                  <span className="text-[0.65rem] md:text-xs text-slate-500">
                    {count} {count === 1 ? "term" : "terms"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Definitions by Letter */}
          <div className="space-y-8 md:space-y-12">
            {letters.map((letter) => (
              <section key={letter} id={`letter-${letter}`}>
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <span className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-900 text-white text-lg md:text-xl font-extrabold rounded-xl">
                    {letter}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {/* Using an unordered list of article cards — a `<dl>` would be
                    more semantic but the children are `<Link>` blocks and not
                    `<dt>`/`<dd>` direct descendants, which axe flags as a
                    serious WCAG violation. */}
                <ul className="space-y-3 md:space-y-4 list-none p-0">
                  {grouped[letter].map((entry) => (
                    <li key={entry.term}>
                      <Link
                        href={`/glossary/${entry.slug}`}
                        id={`term-${entry.term.toLowerCase().replace(/\s+/g, "-")}`}
                        className="block bg-white border border-slate-150 rounded-lg p-3 md:p-4 hover:border-violet-300 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                          <span className="text-sm md:text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                            {entry.term}
                          </span>
                          {entry.category && (
                            <span className="text-[0.6rem] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {entry.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                          {entry.definition}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* FAQ */}
          <section className="border-t border-slate-200 pt-6 md:pt-8 mt-8 md:mt-12">
            <h2 className="text-base md:text-xl font-extrabold text-slate-900 mb-4 md:mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {GLOSSARY_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Related links */}
          <div className="border-t border-slate-200 pt-6 md:pt-8 mt-8 md:mt-12">
            <h2 className="text-sm md:text-base font-bold text-slate-700 mb-3">
              Keep Learning
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/articles"
                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                Guides & Articles &rarr;
              </Link>
              <Link
                href="/article/investing-for-beginners-australia"
                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                Beginner&apos;s Guide &rarr;
              </Link>
              <Link
                href="/compare"
                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                Compare Platforms &rarr;
              </Link>
              <Link
                href="/quiz"
                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                Find Your Platform &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

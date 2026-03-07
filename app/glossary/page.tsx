import Link from "next/link";
import type { Metadata } from "next";
import { GLOSSARY_ENTRIES } from "@/lib/glossary";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import GlossarySearch from "@/components/GlossarySearch";

export const metadata: Metadata = {
  title: "Investing Glossary — Plain-English Definitions",
  description:
    "A-Z glossary of Australian investing terms explained in plain English. Covers shares, ETFs, super, crypto, CFDs, property, robo-advisors, tax & regulatory jargon.",
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "Investing Glossary — Invest.com.au",
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
function groupByLetter() {
  const groups: Record<string, typeof GLOSSARY_ENTRIES> = {};
  for (const entry of GLOSSARY_ENTRIES) {
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
function getCategories(): string[] {
  const cats = new Set<string>();
  for (const entry of GLOSSARY_ENTRIES) {
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

export default function GlossaryPage() {
  const grouped = groupByLetter();
  const letters = Object.keys(grouped).sort();
  const categories = getCategories();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Glossary" },
  ]);

  // JSON-LD DefinedTermSet for SEO
  const glossaryJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Australian Investing Glossary",
    description:
      "Plain-English definitions of financial and investing terms for Australian investors.",
    url: absoluteUrl("/glossary"),
    hasDefinedTerm: GLOSSARY_ENTRIES.map((entry) => ({
      "@type": "DefinedTerm",
      name: entry.term,
      description: entry.definition,
    })),
  };

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

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
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
              Plain-English definitions for {GLOSSARY_ENTRIES.length} investing
              terms. No jargon, no fluff — just what you need to know.
            </p>
          </div>

          {/* Search */}
          <GlossarySearch entries={GLOSSARY_ENTRIES} />

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
              const count = GLOSSARY_ENTRIES.filter(
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

                <dl className="space-y-3 md:space-y-4">
                  {grouped[letter].map((entry) => (
                    <div
                      key={entry.term}
                      id={`term-${entry.term.toLowerCase().replace(/\s+/g, "-")}`}
                      className="bg-white border border-slate-150 rounded-lg p-3 md:p-4 hover:border-slate-300 transition-colors"
                    >
                      <dt className="flex items-center gap-2 mb-1 md:mb-1.5">
                        <span className="text-sm md:text-base font-bold text-slate-900">
                          {entry.term}
                        </span>
                        {entry.category && (
                          <span className="text-[0.6rem] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {entry.category}
                          </span>
                        )}
                      </dt>
                      <dd className="text-xs md:text-sm text-slate-600 leading-relaxed">
                        {entry.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

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

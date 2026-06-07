import type { Metadata } from "next";
import Link from "next/link";
import { searchAll, sanitiseQuery } from "@/lib/search";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Icon from "@/components/Icon";

export const revalidate = 60; // 1-min ISR — results stay fresh while caching infra costs

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q ? sanitiseQuery(q) : "";
  const title = query
    ? `Search results for "${query}" — Invest.com.au`
    : "Search — Invest.com.au";
  const description = query
    ? `Brokers, advisors, articles and glossary results for "${query}".`
    : "Search brokers, advisors, articles, glossary terms and tools across Invest.com.au.";

  return {
    title,
    description,
    alternates: { canonical: query ? `/search?q=${encodeURIComponent(query)}` : "/search" },
    robots: { index: false }, // search pages shouldn't be indexed
  };
}

// ─── Section component ────────────────────────────────────────────────────────

function ResultSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-4">
        <Icon name={icon} size={16} className="text-amber-500" />
        {title}
        <span className="text-sm font-normal text-slate-600">({count})</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ? sanitiseQuery(q) : "";

  let results = null;
  let error: string | null = null;

  if (query.length >= 2) {
    try {
      // Full-results page — higher caps than the overlay
      results = await searchAll(query, {
        brokers: 20,
        advisors: 20,
        articles: 20,
        glossary: 15,
        tools: 10,
      });
    } catch {
      error = "Search is temporarily unavailable. Please try again.";
    }
  }

  const totalHits = results
    ? results.brokers.length +
      results.advisors.length +
      results.articles.length +
      results.glossary.length +
      results.tools.length
    : 0;

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Search", url: absoluteUrl("/search") },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Search bar */}
          <form method="GET" action="/search" className="mb-8">
            <div className="relative">
              <Icon
                name="search"
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search brokers, advisors, articles, glossary…"
                autoFocus={!query}
                className="w-full pl-12 pr-4 py-4 text-base bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                aria-label="Search"
              />
            </div>
          </form>

          {/* Header */}
          {query.length >= 2 && (
            <div className="mb-6">
              {error ? (
                <p role="alert" className="text-sm text-red-600">{error}</p>
              ) : results ? (
                <p className="text-sm text-slate-500">
                  {totalHits === 0
                    ? `No results found for "${query}"`
                    : `${totalHits} result${totalHits !== 1 ? "s" : ""} for "${query}"`}
                  {results.durationMs > 0 && (
                    <span className="ml-2 text-slate-600">
                      ({results.durationMs}ms)
                    </span>
                  )}
                </p>
              ) : null}
            </div>
          )}

          {/* No query state */}
          {query.length < 2 && (
            <div className="text-center py-16">
              <Icon name="search" size={40} className="text-slate-300 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Search Invest.com.au
              </h1>
              <p className="text-slate-500 mb-6">
                Find brokers, financial advisors, articles, glossary terms and calculators
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["CommSec", "CGT calculator", "Vanguard ETF", "financial planner", "SMSF"].map((s) => (
                  <Link
                    key={s}
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-full text-slate-600 hover:border-amber-400 hover:text-amber-700 transition-colors"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && totalHits > 0 && (
            <>
              {/* Brokers */}
              <ResultSection title="Brokers & Platforms" icon="trending-up" count={results.brokers.length}>
                {results.brokers.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/broker/${b.slug}`}
                    className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-3.5 hover:border-amber-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {b.name}
                      </p>
                      {b.tagline && (
                        <p className="text-sm text-slate-500 truncate">{b.tagline}</p>
                      )}
                    </div>
                    <Icon name="arrow-right" size={16} className="text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
                  </Link>
                ))}
              </ResultSection>

              {/* Advisors */}
              <ResultSection title="Financial Professionals" icon="users" count={results.advisors.length}>
                {results.advisors.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/advisor/${a.slug}`}
                    className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-3.5 hover:border-amber-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {a.name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {[a.type, a.firm_name, a.location_display]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Icon name="arrow-right" size={16} className="text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
                  </Link>
                ))}
              </ResultSection>

              {/* Articles */}
              <ResultSection title="Articles & Guides" icon="book-open" count={results.articles.length}>
                {results.articles.map((art) => (
                  <Link
                    key={art.slug}
                    href={`/article/${art.slug}`}
                    className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-3.5 hover:border-amber-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {art.title}
                      </p>
                      {art.excerpt && (
                        <p className="text-sm text-slate-500 line-clamp-2">{art.excerpt}</p>
                      )}
                    </div>
                    <Icon name="arrow-right" size={16} className="text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
                  </Link>
                ))}
              </ResultSection>

              {/* Glossary */}
              <ResultSection title="Glossary" icon="file-text" count={results.glossary.length}>
                {results.glossary.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/glossary#${g.slug}`}
                    className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl px-5 py-3.5 hover:border-amber-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {g.term}
                      </p>
                      <p className="text-sm text-slate-500 line-clamp-2">{g.definition}</p>
                    </div>
                    <Icon name="arrow-right" size={16} className="text-slate-300 group-hover:text-amber-500 shrink-0 mt-0.5 transition-colors" />
                  </Link>
                ))}
              </ResultSection>

              {/* Tools */}
              <ResultSection title="Tools & Calculators" icon="calculator" count={results.tools.length}>
                {results.tools.map((t) => (
                  <Link
                    key={t.slug}
                    href={t.href}
                    className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-3.5 hover:border-amber-300 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {t.title}
                      </p>
                      <p className="text-sm text-slate-500">{t.description}</p>
                    </div>
                    <Icon name="arrow-right" size={16} className="text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
                  </Link>
                ))}
              </ResultSection>
            </>
          )}

          {/* No results */}
          {results && totalHits === 0 && query.length >= 2 && (
            <div className="text-center py-12">
              <Icon name="search" size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold mb-1">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-sm text-slate-600 mb-6">
                Try a broader search term, or browse these sections:
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/compare" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-amber-400 transition-colors">
                  Compare Platforms
                </Link>
                <Link href="/advisors" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-amber-400 transition-colors">
                  Find Advisors
                </Link>
                <Link href="/articles" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-amber-400 transition-colors">
                  All Articles
                </Link>
                <Link href="/glossary" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-amber-400 transition-colors">
                  Glossary
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

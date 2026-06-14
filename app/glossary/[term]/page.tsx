import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { GlossaryEntry } from "@/lib/glossary";
import { getGlossaryBySlug, getGlossaryEntries } from "@/lib/glossary-db";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { definedTermPageJsonLd, glossaryTermQaJsonLd, faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import FloatingRightCTA from "@/components/FloatingRightCTA";

export const revalidate = 86400; // 24h

/* ─── Static params for all terms ─── */
export async function generateStaticParams() {
  const entries = await getGlossaryEntries();
  return entries.map((e) => ({ term: e.slug }));
}

/* ─── Metadata ─── */
export async function generateMetadata({ params }: { params: Promise<{ term: string }> }): Promise<Metadata> {
  const { term: slug } = await params;
  const entry = await getGlossaryBySlug(slug);
  if (!entry) return { robots: { index: false } };

  const title = `What Is ${entry.term}? — Definition & Explanation`;
  const description = entry.definition.length > 155 ? entry.definition.slice(0, 152) + "..." : entry.definition;

  return {
    title,
    description,
    alternates: { canonical: `/glossary/${slug}` },
    openGraph: { title: `${entry.term} — Investing Glossary`, description, images: [{ url: `/api/og?title=${encodeURIComponent(entry.term)}&sub=${encodeURIComponent("Investing Glossary · Definition · " + CURRENT_YEAR)}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

/* ─── Related terms ─── */
function getRelatedTerms(entry: GlossaryEntry, all: GlossaryEntry[]): GlossaryEntry[] {
  const sameCategory = all.filter(
    (e) => e.slug !== entry.slug && e.category === entry.category
  ).slice(0, 6);
  if (sameCategory.length >= 4) return sameCategory;
  const idx = all.findIndex((e) => e.slug === entry.slug);
  const nearby = all.filter((e, i) => e.slug !== entry.slug && Math.abs(i - idx) <= 4);
  return [...new Map([...sameCategory, ...nearby].map((e) => [e.slug, e])).values()].slice(0, 6);
}

/* ─── Page ─── */
export default async function GlossaryTermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term: slug } = await params;
  const all = await getGlossaryEntries();
  const entry = all.find((e) => e.slug === slug);
  if (!entry) notFound();

  const related = getRelatedTerms(entry, all);

  // Fetch related articles by matching the term's category to article tags
  const supabase = await createClient();
  const termWords = entry.term.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const categoryTag = entry.category?.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "").replace(/\//g, "-") || "";
  const searchTags = [...termWords, categoryTag].filter(Boolean);
  const relatedArticles = await (async (): Promise<{ slug: string; title: string; read_time: number }[]> => {
    if (searchTags.length === 0) return [];
    const { data } = await supabase
      .from("articles")
      .select("slug, title, read_time, tags")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(60);
    // articles.tags is jsonb — filter overlap in JS (PostgREST && errors).
    return ((data as { slug: string; title: string; read_time: number; tags?: unknown }[]) || [])
      .filter((r) => Array.isArray(r.tags) && (r.tags as string[]).some((t) => searchTags.includes(t)))
      .slice(0, 3);
  })();


  // WebPage + Speakable + DefinedTerm (mainEntity). Speakable selectors point
  // at the answer-first heading + lead definition so AI/voice systems extract
  // the definition directly. See lib/schema-markup.ts.
  const jsonLd = definedTermPageJsonLd({
    term: entry.term,
    slug: entry.slug,
    definition: entry.definition,
  });

  // GEO: QAPage for the "What is [term]?" question. Adds an AI-citation signal
  // that's separate from the DefinedTerm corpus — DefinedTerm drives corpus-level
  // citation, QAPage drives per-question citation (e.g. "What is franking credit?").
  // Both are needed for full coverage. Emit in a separate <script> block.
  const qaLd = glossaryTermQaJsonLd({
    term: entry.term,
    slug: entry.slug,
    definition: entry.definition,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Glossary", url: absoluteUrl("/glossary") },
    { name: entry.term },
  ]);

  const glossaryFaqs = [
    {
      q: `What does ${entry.term} mean for Australian investors?`,
      a: `${entry.definition} Understanding ${entry.term} is important${entry.category ? ` for anyone involved in ${entry.category.toLowerCase()} in Australia` : " for Australian investors"} — it influences decisions around portfolio construction, tax planning, and risk management. If you're unsure how ${entry.term} applies to your situation, seek advice from an AFSL-licensed financial adviser.`,
    },
    {
      q: `How does ${entry.term} affect my investment portfolio?`,
      a: `The impact of ${entry.term} on your portfolio depends on your investment strategy, tax position, and asset allocation. ${entry.category ? `As a concept within ${entry.category.toLowerCase()}, it` : "It"} can affect everything from return calculations to compliance obligations. For personalised guidance on how ${entry.term} applies to your specific investments, consult a licensed financial adviser at invest.com.au/find-advisor.`,
    },
    {
      q: `Is ${entry.term} regulated in Australia?`,
      a: `Investment activities and financial products related to ${entry.term} are regulated in Australia by ASIC (Australian Securities and Investments Commission) under the Corporations Act 2001. Financial advisers who provide advice about ${entry.term} must hold a valid Australian Financial Services Licence (AFSL). You can verify any adviser's credentials at connect.asic.gov.au. This content is general information only — not personal financial advice.`,
    },
  ];
  const glossaryFaqLd = faqJsonLd(glossaryFaqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* GEO: QAPage — "What is [term]?" canonical answer for AI-answer engines */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qaLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryFaqLd) }} />

      <div className="min-h-screen bg-slate-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/" className="hover:text-violet-600">Home</Link>
              <span>/</span>
              <Link href="/glossary" className="hover:text-violet-600">Glossary</Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">{entry.term}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          {/* Main definition */}
          <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
            {entry.category && (
              <span className="inline-block text-[0.65rem] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full mb-3">
                {entry.category}
              </span>
            )}
            <h1 id="glossary-term-name" className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              What Is {entry.term}?
            </h1>
            <div className="prose prose-slate max-w-none">
              <p id="glossary-term-definition" className="text-base md:text-lg text-slate-600 leading-relaxed">
                {entry.definition}
              </p>
            </div>

            {/* Quick facts box */}
            <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Icon name="info" size={16} className="text-blue-500" />
                Quick Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                <div><strong className="text-slate-700">Term:</strong> {entry.term}</div>
                {entry.category && <div><strong className="text-slate-700">Category:</strong> {entry.category}</div>}
                <div><strong className="text-slate-700">Relevance:</strong> Australian investing</div>
                <div><strong className="text-slate-700">Last updated:</strong> {CURRENT_YEAR}</div>
              </div>
            </div>
          </article>

          {/* Related terms */}
          {related.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Related Terms</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/glossary/${r.slug}`}
                    className="bg-white border border-slate-200 rounded-lg p-3 hover:border-violet-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-bold text-slate-900 group-hover:text-violet-700">{r.term}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{r.definition}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {relatedArticles && relatedArticles.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Learn More</h2>
              <div className="space-y-2">
                {relatedArticles.map((ra: { slug: string; title: string; read_time: number }) => (
                  <Link
                    key={ra.slug}
                    href={`/article/${ra.slug}`}
                    className="block bg-white border border-slate-200 rounded-lg p-3 hover:border-violet-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-bold text-slate-900 group-hover:text-violet-700">{ra.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ra.read_time} min read</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQ accordion */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Common questions</h2>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {glossaryFaqs.map(({ q, a }) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-slate-800 font-medium text-sm leading-snug gap-4">
                    {q}
                    <svg
                      className="w-4 h-4 shrink-0 text-slate-500 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Back to glossary */}
          <div className="mt-8 text-center">
            <Link href="/glossary" className="text-sm font-semibold text-violet-600 hover:text-violet-800">
              ← Back to Full Glossary
            </Link>
          </div>
        </div>
      </div>

      <FloatingRightCTA
        href="/compare"
        label="Compare platforms"
        storageKey={`glossary:${slug}`}
        variant="ink"
        trackingContext="glossary"
      />
    </>
  );
}

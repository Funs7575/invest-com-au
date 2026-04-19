import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { GlossaryEntry } from "@/lib/glossary";
import { getGlossaryBySlug, getGlossaryEntries } from "@/lib/glossary-db";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";

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
  if (!entry) return {};

  const title = `What Is ${entry.term}? — Definition & Explanation`;
  const description = entry.definition.length > 155 ? entry.definition.slice(0, 152) + "..." : entry.definition;

  return {
    title,
    description,
    alternates: { canonical: `/glossary/${slug}` },
    openGraph: { title: `${entry.term} — Investing Glossary`, description },
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
  const { data: relatedArticles } = searchTags.length > 0
    ? await supabase.from("articles").select("slug, title, read_time").eq("status", "published").overlaps("tags", searchTags).limit(3)
    : { data: [] };


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.term,
    description: entry.definition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Invest.com.au Investing Glossary",
      url: absoluteUrl("/glossary"),
    },
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Glossary", url: absoluteUrl("/glossary") },
    { name: entry.term },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="min-h-screen bg-slate-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500">
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
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              What Is {entry.term}?
            </h1>
            <div className="prose prose-slate max-w-none">
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
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

          {/* Back to glossary */}
          <div className="mt-8 text-center">
            <Link href="/glossary" className="text-sm font-semibold text-violet-600 hover:text-violet-800">
              ← Back to Full Glossary
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

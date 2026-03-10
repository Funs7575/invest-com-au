import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { fallbackAvatarUrl } from "@/lib/admin";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Expert Insights — Advice from Verified Professionals (${CURRENT_YEAR})`,
  description: "Read expert articles from verified Australian financial advisors, SMSF accountants, and tax agents. Practical investing insights you can act on.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/expert" },
  openGraph: {
    title: `Expert Insights — Verified Financial Professionals (${CURRENT_YEAR})`,
    description: "Read expert articles from verified Australian financial advisors, SMSF accountants, and tax agents.",
    images: [{ url: "/api/og?title=Expert+Insights&subtitle=Advice+from+Verified+Professionals&type=default", width: 1200, height: 630 }],
  },
};

export default async function ExpertInsightsPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("advisor_articles")
    .select("id, title, slug, excerpt, category, tags, author_name, author_firm, author_slug, published_at, view_count, featured, read_time, word_count, pricing_tier, professionals!advisor_articles_professional_id_fkey(name, slug, photo_url, verified, type)")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  const allArticles = articles || [];
  const featuredArticles = allArticles.filter(a => a.featured);
  const regularArticles = allArticles.filter(a => !a.featured);
  const categories = Array.from(new Set(allArticles.map(a => a.category).filter(Boolean)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Expert Insights — Invest.com.au",
    description: "Expert articles from verified Australian financial professionals.",
    url: "https://invest.com.au/expert",
    mainEntity: allArticles.slice(0, 10).map(a => ({
      "@type": "Article",
      headline: a.title,
      author: { "@type": "Person", name: a.author_name },
      datePublished: a.published_at,
      url: `https://invest.com.au/expert/${a.slug}`,
    })),
  };

  function ArticleCard({ a }: { a: typeof allArticles[0] }) {
    const rawPro = a.professionals as unknown;
    const pro = (Array.isArray(rawPro) ? rawPro[0] : rawPro) as { name: string; slug: string; photo_url: string | null; verified: boolean; type: string } | null;
    const typeLabel = pro?.type ? (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[pro.type] || pro.type.replace(/_/g, " ") : "";

    return (
      <Link href={`/expert/${a.slug}`} className="block bg-white border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-lg hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-center gap-2 mb-2">
          {a.category && <span className="text-[0.58rem] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{a.category}</span>}
          {a.featured && <span className="text-[0.58rem] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Featured</span>}
          {a.read_time ? <span className="text-[0.58rem] text-slate-400">{a.read_time} min read</span> : null}
        </div>
        <h2 className="text-sm md:text-base font-bold text-slate-900 mb-1.5 line-clamp-2 group-hover:text-violet-700">{a.title}</h2>
        {a.excerpt && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.excerpt}</p>}
        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
          <img
            src={pro?.photo_url || fallbackAvatarUrl(a.author_name, 40)}
            alt={a.author_name}
            className="w-7 h-7 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-700 truncate block">{a.author_name}</span>
            <span className="text-[0.58rem] text-slate-400 truncate block">
              {a.author_firm || typeLabel}
              {a.published_at && ` · ${new Date(a.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
            </span>
          </div>
          {pro?.verified && (
            <span className="shrink-0 text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 flex items-center gap-0.5">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Verified
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-5xl">
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Expert Insights</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl p-5 md:p-8 mb-5 md:mb-8">
            <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-3">Expert Insights</h1>
            <p className="text-xs md:text-base text-slate-500 mb-3 max-w-2xl">
              Practical advice from verified Australian financial professionals — SMSF accountants, financial planners, tax agents, and more. Every author is ASIC-verified.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[0.62rem] md:text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-violet-500 rounded-full" />
                <span className="font-semibold text-slate-700">{allArticles.length}</span> articles
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                All authors verified
              </span>
              {categories.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  {categories.length} categories
                </span>
              )}
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="text-xs font-bold text-slate-400 self-center mr-1">Filter:</span>
              {categories.map(c => (
                <span key={c} className="text-[0.62rem] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
          )}

          {/* Featured */}
          {featuredArticles.length > 0 && (
            <div className="mb-6 md:mb-8">
              <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" /> Featured
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {featuredArticles.map(a => <ArticleCard key={a.id} a={a} />)}
              </div>
            </div>
          )}

          {/* All articles */}
          {regularArticles.length > 0 ? (
            <div>
              {featuredArticles.length > 0 && (
                <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3">Latest</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {regularArticles.map(a => <ArticleCard key={a.id} a={a} />)}
              </div>
            </div>
          ) : allArticles.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <div className="text-3xl mb-3">📝</div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Expert articles coming soon</h2>
              <p className="text-xs text-slate-500 mb-4">Verified financial professionals are writing for this section.</p>
              <Link href="/for-advisors" className="inline-block px-5 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                Are you an advisor? Write for us →
              </Link>
            </div>
          ) : null}

          {/* CTA for advisors */}
          <div className="mt-8 bg-gradient-to-r from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 text-white">
            <h2 className="text-base md:text-xl font-bold mb-2">Are you a financial professional?</h2>
            <p className="text-xs md:text-sm text-violet-200 mb-4 max-w-xl">
              Share your expertise with thousands of Australian investors. Published articles link directly to your professional profile and drive enquiries.
            </p>
            <Link href="/for-advisors" className="inline-block px-5 py-2.5 bg-white text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-50 transition-colors">
              Learn More & Apply →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

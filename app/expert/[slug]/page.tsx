import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("advisor_articles")
    .select("title, excerpt, meta_title, meta_description, author_name, category")
    .eq("slug", slug).eq("status", "published").single();
  if (!a) return { title: "Article Not Found" };
  return {
    title: a.meta_title || `${a.title} — Expert Insights`,
    description: a.meta_description || a.excerpt || `${a.title} by ${a.author_name}`,
    alternates: { canonical: `/expert/${slug}` },
    openGraph: {
      title: a.meta_title || a.title,
      description: a.meta_description || a.excerpt,
      url: `/expert/${slug}`,
      type: "article",
    },
  };
}

export default async function ExpertArticlePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("advisor_articles")
    .select("*, professionals!advisor_articles_professional_id_fkey(id, name, slug, firm_name, type, photo_url, verified, rating, review_count, bio, specialties, location_display)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) notFound();

  const pro = article.professionals;
  const publishDate = article.published_at ? new Date(article.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "";

  // Increment view
  await supabase.from("advisor_articles").update({ view_count: (article.view_count || 0) + 1 }).eq("id", article.id);

  // Related articles by same author or category
  const { data: related } = await supabase
    .from("advisor_articles")
    .select("title, slug, author_name, published_at, excerpt")
    .eq("status", "published")
    .neq("id", article.id)
    .or(`professional_id.eq.${article.professional_id},category.eq.${article.category}`)
    .order("published_at", { ascending: false })
    .limit(3);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.published_at,
    author: { "@type": "Person", name: article.author_name, url: absoluteUrl(`/advisor/${article.author_slug}`) },
    publisher: { "@type": "Organization", name: "Invest.com.au", url: SITE_URL },
    mainEntityOfPage: absoluteUrl(`/expert/${slug}`),
  };

  // Simple markdown to HTML (basic — headings, bold, italic, links, lists)
  function renderMarkdown(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-slate-900 mt-6 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-900 mt-8 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h2 class="text-2xl font-extrabold text-slate-900 mt-8 mb-3">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-violet-600 hover:text-violet-800 underline">$1</a>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-600">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-600">$2</li>')
      .replace(/\n\n/g, '</p><p class="text-sm md:text-base text-slate-600 leading-relaxed mb-4">')
      .replace(/^/, '<p class="text-sm md:text-base text-slate-600 leading-relaxed mb-4">')
      + '</p>';
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="py-5 md:py-10">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/expert" className="hover:text-slate-900">Expert Insights</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700 truncate">{article.title.slice(0, 40)}{article.title.length > 40 ? "..." : ""}</span>
          </nav>

          {/* Article Header */}
          <header className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[0.62rem] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{article.category}</span>
              {article.pricing_tier === "featured" && <span className="text-[0.62rem] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Featured</span>}
              {article.pricing_tier === "sponsored" && <span className="text-[0.62rem] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Sponsored</span>}
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="text-sm md:text-lg text-slate-500 leading-relaxed">{article.excerpt}</p>
            )}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <Link href={`/advisor/${pro?.slug}`} className="shrink-0">
                {pro?.photo_url ? (
                  <Image src={pro.photo_url} alt={pro.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-600">
                    {pro?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </div>
                )}
              </Link>
              <div>
                <Link href={`/advisor/${pro?.slug}`} className="text-sm font-bold text-slate-900 hover:text-violet-700 transition-colors">
                  {article.author_name}
                </Link>
                <div className="text-xs text-slate-500">
                  {article.author_firm && <span>{article.author_firm} · </span>}
                  {publishDate}
                </div>
              </div>
            </div>
          </header>

          {/* Article Body */}
          <article
            className="prose-custom mb-8 md:mb-12"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />

          {/* Author Card */}
          {pro && (
            <div className="bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-200 rounded-2xl p-5 md:p-6 mb-6 md:mb-8">
              <div className="flex items-start gap-4">
                <Link href={`/advisor/${pro.slug}`} className="shrink-0">
                  {pro.photo_url ? (
                    <Image src={pro.photo_url} alt={pro.name} width={64} height={64} className="w-16 h-16 rounded-xl object-cover ring-2 ring-violet-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-violet-100 flex items-center justify-center text-lg font-bold text-violet-600">
                      {pro.name?.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/advisor/${pro.slug}`} className="text-base font-bold text-slate-900 hover:text-violet-700">{pro.name}</Link>
                    {pro.verified && (
                      <span className="text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-0.5">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Verified
                      </span>
                    )}
                  </div>
                  {pro.firm_name && <p className="text-xs text-slate-500 mb-1">{pro.firm_name} · {pro.location_display}</p>}
                  {pro.bio && <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{pro.bio}</p>}
                  <Link href={`/advisor/${pro.slug}`} className="inline-block mt-2 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                    View Profile & Book Consultation →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 text-[0.62rem] text-slate-500 leading-relaxed">
            <strong>Disclaimer:</strong> This article is written by {article.author_name} and published on Invest.com.au as expert content. It is general information only and does not constitute personal financial advice. Consider your own circumstances before acting on any information. Invest.com.au charges a publication fee for expert articles.
          </div>

          {/* Related Articles */}
          {related && related.length > 0 && (
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">More Expert Insights</h2>
              <div className="space-y-2">
                {related.map((r) => (
                  <Link key={r.slug} href={`/expert/${r.slug}`} className="block bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all">
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">{r.title}</h3>
                    <p className="text-xs text-slate-500">By {r.author_name} · {r.published_at ? new Date(r.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : ""}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cross-links: compare platforms & find advisors */}
          <div className="mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/compare" className="bg-slate-900 text-white rounded-xl p-4 hover:bg-slate-800 transition-colors group">
              <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5">
                Compare Platforms <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </h3>
              <p className="text-xs text-slate-300">Side-by-side fee comparison of Australian brokers</p>
            </Link>
            <Link href="/advisors" className="bg-violet-600 text-white rounded-xl p-4 hover:bg-violet-700 transition-colors group">
              <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5">
                Find an Advisor <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </h3>
              <p className="text-xs text-violet-200">Connect with verified financial professionals</p>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

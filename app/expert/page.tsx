import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Expert Insights — Advice from Verified Professionals (${CURRENT_YEAR})`,
  description: "Read expert articles from verified Australian financial advisors, SMSF accountants, and tax agents. Practical investing insights you can act on.",
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
    .select("id, title, slug, excerpt, category, tags, author_name, author_firm, author_slug, published_at, view_count, pricing_tier, professionals!advisor_articles_professional_id_fkey(name, slug, photo_url, verified, type)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const categories = Array.from(new Set((articles || []).map(a => a.category).filter(Boolean)));

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-4xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Expert Insights</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl p-5 md:p-8 mb-5 md:mb-8">
          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-3">Expert Insights</h1>
          <p className="text-xs md:text-base text-slate-500 mb-3">
            Practical advice from verified Australian financial professionals — SMSF accountants, financial planners, tax agents, and more.
          </p>
          <div className="flex items-center gap-3 text-[0.62rem] md:text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-violet-500 rounded-full" />
              <span className="font-semibold text-slate-700">{articles?.length || 0}</span> articles
            </span>
            <span>All authors ASIC-verified</span>
          </div>
        </div>

        {/* Articles */}
        {articles && articles.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {articles.map((a) => {
              const pro = a.professionals as { name: string; slug: string; photo_url: string | null; verified: boolean; type: string } | null;
              return (
                <Link key={a.id} href={`/expert/${a.slug}`} className="block bg-white border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-lg hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[0.56rem] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{a.category}</span>
                    {a.pricing_tier === "featured" && <span className="text-[0.56rem] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Featured</span>}
                    {a.pricing_tier === "sponsored" && <span className="text-[0.56rem] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Sponsored</span>}
                  </div>
                  <h2 className="text-sm md:text-lg font-bold text-slate-900 mb-1 group-hover:text-violet-700">{a.title}</h2>
                  {a.excerpt && <p className="text-xs md:text-sm text-slate-500 mb-3 line-clamp-2">{a.excerpt}</p>}
                  <div className="flex items-center gap-2.5">
                    {pro?.photo_url ? (
                      <img src={pro.photo_url} alt={pro.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-violet-100" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-[0.5rem] font-bold text-violet-600">
                        {pro?.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{a.author_name}</span>
                      {a.author_firm && <span> · {a.author_firm}</span>}
                      {a.published_at && <span> · {new Date(a.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>}
                    </div>
                    {a.view_count > 0 && <span className="text-[0.56rem] text-slate-400 ml-auto">{a.view_count} views</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Expert content coming soon</h2>
            <p className="text-sm text-slate-500 mb-5">Verified financial professionals are writing expert articles. Check back soon.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/articles" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">Browse Guides →</Link>
              <Link href="/advisor-apply" className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700">Write for Us →</Link>
            </div>
          </div>
        )}

        {/* CTA for advisors */}
        <div className="mt-8 bg-slate-900 rounded-2xl p-5 md:p-8 text-center text-white">
          <h3 className="text-lg md:text-xl font-extrabold mb-2">Are you a financial professional?</h3>
          <p className="text-sm text-slate-300 mb-4">Write expert articles and reach thousands of Australian investors. Get published with your profile linked.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/advisor-apply" className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700">Get Listed & Write →</Link>
            <Link href="/advisors" className="px-5 py-2.5 border border-white/30 text-white text-sm font-semibold rounded-lg hover:bg-white/10">Browse Advisors →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

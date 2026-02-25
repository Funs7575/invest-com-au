import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import Link from "next/link";
import { Suspense } from "react";
import ArticleSearchInput from "@/components/ArticleSearchInput";
import ArticleCategoryFilter from "@/components/ArticleCategoryFilter";
import LeadMagnet from "@/components/LeadMagnet";

export const metadata = {
  title: "Investing Guides & Articles",
  description:
    "Expert guides on tax, SMSF, beginner investing, strategy, and market news. Make smarter investment decisions with independent Australian research.",
  openGraph: {
    title: "Investing Guides & Articles — Invest.com.au",
    description:
      "Expert guides on tax, SMSF, beginner investing, strategy, and market news.",
    images: [
      {
        url: "/api/og?title=Investing+Guides&subtitle=Expert+guides+on+tax,+SMSF,+strategy&type=article",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/articles" },
};

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
  reviews: "bg-slate-100 text-slate-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  tax: "Tax",
  beginners: "Beginners",
  smsf: "SMSF",
  strategy: "Strategy",
  news: "News",
  reviews: "Reviews",
};

export const revalidate = 3600; // ISR: revalidate every hour

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false });

  // Server-side filtering
  let filtered = (articles as Article[]) || [];

  if (category && category !== "all") {
    filtered = filtered.filter((a) => a.category === category);
  }

  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(query)) ||
        (a.category && a.category.toLowerCase().includes(query))
    );
  }

  // Build display items: articles with lead magnets inserted every 6 articles
  const displayItems: (Article | "lead-magnet")[] = [];
  filtered.forEach((article, i) => {
    displayItems.push(article);
    if ((i + 1) % 6 === 0 && i + 1 < filtered.length) {
      displayItems.push("lead-magnet");
    }
  });

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        {/* Page Header */}
        <div className="mb-2.5 md:mb-10">
          <h1 className="text-lg md:text-4xl font-extrabold mb-0.5 md:mb-3">
            Guides &amp; Articles
          </h1>
          <p className="text-[0.69rem] md:text-lg text-slate-600 max-w-2xl">
            Expert guides on tax, SMSF, strategy &amp; more
          </p>
        </div>

        {/* Search + Category Filter row on mobile */}
        <Suspense fallback={<div className="h-10 mb-2 md:mb-4" />}>
          <ArticleSearchInput />
        </Suspense>

        <Suspense fallback={<div className="h-8 mb-3 md:mb-8" />}>
          <ArticleCategoryFilter />
        </Suspense>

        {/* Articles Grid — fully server-rendered */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
          {displayItems.map((item, idx) => {
            if (item === "lead-magnet") {
              return (
                <div
                  key={`lead-magnet-${idx}`}
                  className="col-span-2 lg:col-span-3"
                >
                  <LeadMagnet />
                </div>
              );
            }

            const article = item;
            const categoryColor =
              CATEGORY_COLORS[article.category || ""] ||
              "bg-slate-100 text-slate-700";

            return (
              <Link
                key={article.id}
                href={`/article/${article.slug}`}
                className="border border-slate-200 rounded-lg md:rounded-xl bg-white hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col overflow-hidden group"
              >
                {/* Cover Image */}
                {article.cover_image_url ? (
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    <img
                      src={article.cover_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="p-2.5 md:p-6 flex flex-col flex-1">
                  {/* Badges Row */}
                  <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-3">
                    {article.category && (
                      <span
                        className={`text-[0.62rem] md:text-xs font-semibold px-1.5 md:px-2.5 py-px md:py-0.5 rounded-full ${categoryColor}`}
                      >
                        {CATEGORY_LABELS[article.category || ""] || article.category}
                      </span>
                    )}
                    <span
                      className={`hidden md:inline text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        article.evergreen
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {article.evergreen ? "Evergreen" : "News"}
                    </span>
                    {article.read_time && (
                      <span className="text-[0.62rem] md:text-xs text-slate-400 ml-auto">
                        {article.read_time} min
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xs md:text-lg font-bold mb-1 md:mb-2 line-clamp-2 leading-snug">
                    {article.title}
                  </h2>

                  {/* Excerpt — hidden on mobile to save space */}
                  {article.excerpt && (
                    <p className="hidden md:block text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                      {article.excerpt}
                    </p>
                  )}

                  {/* CTA */}
                  <span className="text-[0.62rem] md:text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors mt-auto">
                    Read →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-8 md:py-16 text-slate-500">
            <p className="text-sm md:text-lg font-medium mb-1 md:mb-2">No articles found</p>
            <p className="text-xs md:text-sm">
              {q
                ? "Try a different search or category."
                : "Try selecting a different category."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

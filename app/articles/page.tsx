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
  alternates: { canonical: "/articles" },
};

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
};

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
    <div className="py-12">
      <div className="container-custom">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold mb-3">
            Investing Guides &amp; Articles
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Expert guides to help you make smarter investment decisions — from
            tax strategies and SMSF tips to beginner walkthroughs and market
            news.
          </p>
        </div>

        {/* Search — client component (tiny) */}
        <Suspense fallback={<div className="h-11 mb-4" />}>
          <ArticleSearchInput />
        </Suspense>

        {/* Category Filter — client component (tiny, uses Link for navigation) */}
        <Suspense fallback={<div className="h-10 mb-8" />}>
          <ArticleCategoryFilter />
        </Suspense>

        {/* Articles Grid — fully server-rendered */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayItems.map((item, idx) => {
            if (item === "lead-magnet") {
              return (
                <div
                  key={`lead-magnet-${idx}`}
                  className="md:col-span-2 lg:col-span-3"
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
              <div
                key={article.id}
                className="border border-slate-200 rounded-xl bg-white hover:shadow-lg hover:scale-[1.02] transition-all flex flex-col"
              >
                <div className="p-6 flex flex-col flex-1">
                  {/* Badges Row */}
                  <div className="flex items-center gap-2 mb-3">
                    {article.category && (
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${categoryColor}`}
                      >
                        {article.category}
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        article.evergreen
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {article.evergreen ? "Evergreen" : "News"}
                    </span>
                    {article.read_time && (
                      <span className="text-xs text-slate-400 ml-auto">
                        {article.read_time} min read
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold mb-2 line-clamp-2">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  {article.excerpt && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                      {article.excerpt}
                    </p>
                  )}

                  {/* CTA */}
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors mt-auto"
                  >
                    Read Guide &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium mb-2">No articles found</p>
            <p className="text-sm">
              {q
                ? "Try a different search term or category."
                : "Try selecting a different category."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

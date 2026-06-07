"use client";

import { useState } from "react";
import Link from "next/link";
const Search = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
import type { Article } from "@/lib/types";
import LeadMagnet from "@/components/LeadMagnet";

const CATEGORIES = ["tax", "beginners", "smsf", "strategy", "news", "reviews", "etfs", "super", "property", "crypto"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-emerald-100 text-emerald-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
  reviews: "bg-sky-100 text-sky-700",
  etfs: "bg-teal-100 text-teal-700",
  super: "bg-orange-100 text-orange-700",
  property: "bg-lime-100 text-lime-700",
  crypto: "bg-violet-100 text-violet-700",
};

type SortKey = "newest" | "views" | "trending";

export default function ArticlesClient({ articles }: { articles: Article[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const filtered = (() => {
    let list =
      activeCategory === "all"
        ? articles
        : articles.filter((a) => a.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
          (a.category && a.category.toLowerCase().includes(q))
      );
    }
    // ADV-021: sort
    if (sortKey === "newest") {
      list = [...list].sort((a, b) => {
        const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bDate - aDate;
      });
    } else if (sortKey === "views") {
      list = [...list].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    } else if (sortKey === "trending") {
      // Trending: weight views by recency — more recent high-view articles rank first
      // eslint-disable-next-line react-hooks/purity -- client component inside useMemo, Date.now() is appropriate here
      const now = Date.now();
      const score = (a: Article) => {
        const ageMs = now - (a.published_at ? new Date(a.published_at).getTime() : now);
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        return (a.view_count ?? 0) / Math.max(1, ageDays);
      };
      list = [...list].sort((a, b) => score(b) - score(a));
    }
    return list;
  })();

  // Build display items: articles with lead magnets inserted every 6 articles
  const displayItems: (Article | "lead-magnet")[] = [];
  filtered.forEach((article, i) => {
    displayItems.push(article);
    if ((i + 1) % 6 === 0 && i + 1 < filtered.length) {
      displayItems.push("lead-magnet");
    }
  });

  return (
    <div>
      {/* Search + Sort row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search" enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            aria-label="Search articles"
          />
        </div>
        {/* ADV-021: sort selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-700"
            aria-label="Sort articles"
          >
            <option value="newest">Newest</option>
            <option value="views">Most views</option>
            <option value="trending">Trending</option>
          </select>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by category">
        <button
          onClick={() => setActiveCategory("all")}
          aria-pressed={activeCategory === "all"}
          className={`px-4 py-2 text-sm font-medium rounded-full filter-pill ${
            activeCategory === "all"
              ? "bg-blue-700 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`px-4 py-2 text-sm font-medium rounded-full capitalize filter-pill ${
              activeCategory === cat
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div key={`${activeCategory}-${searchQuery}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayItems.map((item, idx) => {
          if (item === "lead-magnet") {
            return (
              <div key={`lead-magnet-${idx}`} className="md:col-span-2 lg:col-span-3">
                <LeadMagnet />
              </div>
            );
          }

          const article = item;
          const categoryColor =
            CATEGORY_COLORS[article.category || ""] || "bg-slate-100 text-slate-700";

          return (
            <div
              key={article.id}
              className="border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow flex flex-col stagger-item"
              style={{ animationDelay: `${0.05 + (idx % 6) * 0.08}s` }}
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
                <h2 className="text-lg font-bold mb-2 line-clamp-2">{article.title}</h2>

                {/* Excerpt */}
                {article.excerpt && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                    {article.excerpt}
                  </p>
                )}

                {/* CTA */}
                <Link
                  href={`/article/${article.slug}`}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors mt-auto"
                >
                  Read Guide &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {/* ADV-113: No-results escape hatch — reset + curated trending picks */}
      {filtered.length === 0 && (
        <div className="text-center py-12 col-span-full">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-800 mb-1">No articles found</p>
          <p className="text-sm text-slate-500 mb-5">
            {searchQuery ? "Try a different search term." : "Nothing in this category yet."}
          </p>
          <button
            onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors mb-8"
          >
            Browse all articles
          </button>
          <div className="text-left max-w-sm mx-auto">
            <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Popular reads</p>
            <div className="space-y-2">
              {[
                { href: "/articles/how-to-start-investing", label: "How to start investing in Australia" },
                { href: "/articles/etfs-vs-shares", label: "ETFs vs shares: which is right for you?" },
                { href: "/articles/best-investment-platforms", label: "Best investment platforms in Australia (2026)" },
                { href: "/articles/superannuation-guide", label: "Superannuation explained: a plain-English guide" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-700 hover:underline">
                  <span className="text-blue-400 text-xs">→</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

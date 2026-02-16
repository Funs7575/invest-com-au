"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Article } from "@/lib/types";
import LeadMagnet from "@/components/LeadMagnet";

const CATEGORIES = ["tax", "beginners", "smsf", "strategy", "news"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
};

export default function ArticlesClient({ articles }: { articles: Article[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full md:w-80 pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
          aria-label="Search articles"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Article category filter">
        <button
          onClick={() => setActiveCategory("all")}
          role="tab"
          aria-selected={activeCategory === "all"}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
            activeCategory === "all"
              ? "bg-green-700 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            role="tab"
            aria-selected={activeCategory === cat}
            className={`px-4 py-2 text-sm font-medium rounded-full capitalize transition-colors ${
              activeCategory === cat
                ? "bg-green-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow flex flex-col"
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
            {searchQuery
              ? "Try a different search term or category."
              : "Try selecting a different category."}
          </p>
        </div>
      )}
    </div>
  );
}

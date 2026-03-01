"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORIES = ["tax", "beginners", "smsf", "strategy", "news", "reviews"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  tax: "Tax",
  beginners: "Beginners",
  smsf: "SMSF",
  strategy: "Strategy",
  news: "News",
  reviews: "Reviews",
};

export default function ArticleCategoryFilter() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const q = searchParams.get("q");

  function href(cat: string) {
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/articles${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex md:flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-8 overflow-x-auto pb-1 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0" role="tablist" aria-label="Article category filter">
      <Link
        href={href("all")}
        role="tab"
        aria-selected={activeCategory === "all"}
        scroll={false}
        className={`shrink-0 px-3 md:px-4 py-2 md:py-2 min-h-[44px] inline-flex items-center text-xs md:text-sm font-medium rounded-full transition-colors ${
          activeCategory === "all"
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        All
      </Link>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={href(cat)}
          role="tab"
          aria-selected={activeCategory === cat}
          scroll={false}
          className={`shrink-0 px-3 md:px-4 py-2 md:py-2 min-h-[44px] inline-flex items-center text-xs md:text-sm font-medium rounded-full transition-colors ${
            activeCategory === cat
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {CATEGORY_LABELS[cat] || cat}
        </Link>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORIES = ["tax", "beginners", "smsf", "strategy", "news"] as const;

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
    <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Article category filter">
      <Link
        href={href("all")}
        role="tab"
        aria-selected={activeCategory === "all"}
        scroll={false}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          activeCategory === "all"
            ? "bg-green-700 text-white"
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
          className={`px-4 py-2 text-sm font-medium rounded-full capitalize transition-colors ${
            activeCategory === cat
              ? "bg-green-700 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}

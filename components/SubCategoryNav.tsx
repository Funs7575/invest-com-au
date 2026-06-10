import Link from "next/link";
import type { InvestCategory } from "@/lib/invest-categories";

interface SubCategoryNavProps {
  category: InvestCategory;
  /** The currently active subcategory slug, if on a subcategory page */
  activeSubcategory?: string;
}

/**
 * Horizontal sub-category navigation strip for /invest/{category}/listings pages.
 * Renders as underline tabs (distinct from the amber filter chips inside the listing grid)
 * to make clear these are page-level navigation links, not in-page filters.
 *
 * Renders nothing if the category has no sub-categories defined.
 */
export default function SubCategoryNav({ category, activeSubcategory }: SubCategoryNavProps) {
  if (!category.subcategories || category.subcategories.length === 0) {
    return null;
  }

  const baseHref = `/invest/${category.slug}/listings`;

  return (
    <nav
      aria-label={`${category.label} sub-categories`}
      className="mb-6"
    >
      <p className="text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
        Browse by type
      </p>
      {/* Scrollable tab row with fade masks */}
      <div className="relative">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-slate-200">
          {/* "All" tab */}
          <Link
            href={baseHref}
            className={`shrink-0 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              !activeSubcategory
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            {...(!activeSubcategory ? { "aria-current": "page" as const } : {})}
          >
            All {category.label}
          </Link>

          {category.subcategories.map((sub) => {
            const isActive = activeSubcategory === sub.slug;
            return (
              <Link
                key={sub.slug}
                href={`${baseHref}/${sub.slug}`}
                className={`group shrink-0 inline-flex items-center gap-1 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
                {...(isActive ? { "aria-current": "page" as const } : {})}
              >
                {sub.label}
                {/* arrow hints this is a page link, not a filter */}
                <svg
                  className="w-2.5 h-2.5 opacity-40 group-hover:opacity-70 transition-opacity"
                  fill="none"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

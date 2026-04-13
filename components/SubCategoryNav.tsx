import Link from "next/link";
import type { InvestCategory } from "@/lib/invest-categories";

interface SubCategoryNavProps {
  category: InvestCategory;
  /** The currently active subcategory slug, if on a subcategory page */
  activeSubcategory?: string;
}

/**
 * Horizontal sub-category navigation strip for /invest/{category}/listings pages.
 * Lets users drill into specific sub-categories like wine/art/cars on alternatives.
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
      className="bg-white border border-slate-200 rounded-2xl p-4 mb-6"
    >
      <p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-slate-500 mb-3">
        Browse by {category.subcategories[0]?.label ? "type" : "category"}
      </p>
      <div className="flex flex-wrap gap-2">
        {/* "All" pill — links back to category listings without a sub filter */}
        <Link
          href={baseHref}
          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
            !activeSubcategory
              ? "bg-slate-900 text-white"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
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
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
              {...(isActive ? { "aria-current": "page" as const } : {})}
            >
              {sub.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

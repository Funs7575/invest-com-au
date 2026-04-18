import Link from "next/link";
import Icon from "@/components/Icon";

interface ListingsEmptyStateProps {
  /**
   * Human-readable category label shown in the heading
   * (e.g. "Mining", "Alternative Investments").
   */
  categoryLabel: string;
  /**
   * URL slug of the category — used for the "back to all"
   * link (e.g. "mining" → /invest/mining/listings).
   */
  categorySlug: string;
  /**
   * If the empty state is for a specific sub-category filter
   * (e.g. "coins" within alternatives), pass the sub-category
   * label so the heading can name it.
   */
  subCategoryLabel?: string;
  /**
   * Icon name from the shared Icon sprite. Defaults to
   * "layers" which works as a neutral "no results" visual.
   */
  icon?: string;
  /**
   * Optional override for the body copy. The default is
   * generated from the category + sub-category labels.
   */
  description?: string;
}

/**
 * Reusable empty state for the investment listings routes.
 *
 * Rendered whenever a listings page has no matching rows:
 *   - /invest/{cat}/listings with zero listings in the vertical
 *   - /invest/{cat}/listings/{slug} where the slug matches a
 *     sub-category but no listings exist yet
 *   - /invest/{cat}/listings/{slug} where the slug doesn't match
 *     any sub-category or any listing
 *
 * Always renders a valid page (HTTP 200) — never a 404 or 503.
 * Gives the visitor two clear next steps: browse the parent
 * category or submit their own listing.
 */
export default function ListingsEmptyState({
  categoryLabel,
  categorySlug,
  subCategoryLabel,
  icon = "layers",
  description,
}: ListingsEmptyStateProps) {
  const heading = subCategoryLabel
    ? `No ${subCategoryLabel} listings yet`
    : `No ${categoryLabel.toLowerCase()} listings yet`;

  const defaultDescription = subCategoryLabel
    ? `We don't have any ${subCategoryLabel} listings right now. Check back soon, browse all ${categoryLabel.toLowerCase()} opportunities, or submit your own listing below.`
    : `We're still gathering ${categoryLabel.toLowerCase()} listings. Check back soon or submit your own below — new listings are reviewed within 48 hours.`;

  return (
    <div className="py-12 md:py-20">
      <div className="container-custom max-w-xl text-center">
        <div
          className="w-16 h-16 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center"
          aria-hidden="true"
        >
          <Icon name={icon} size={28} className="text-slate-400" />
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
          {heading}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {description ?? defaultDescription}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {subCategoryLabel ? (
            <Link
              href={`/invest/${categorySlug}/listings`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              Browse all {categoryLabel}
              <Icon name="arrow-right" size={14} />
            </Link>
          ) : null}
          <Link
            href="/invest/list"
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 font-semibold rounded-lg text-sm transition-colors ${
              subCategoryLabel
                ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                : "bg-amber-500 hover:bg-amber-400 text-slate-900"
            }`}
          >
            Submit a listing
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

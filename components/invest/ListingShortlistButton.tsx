"use client";

import { useListingShortlist } from "@/lib/hooks/useListingShortlist";
import Icon from "@/components/Icon";

/**
 * Per-card bookmark button. Renders the bookmark icon in two states
 * (outline / filled) keyed off whether the listing slug is in the
 * client's shortlist. Designed to be dropped onto the listing card's
 * hero area as an absolutely-positioned control — the parent <Link>
 * gets `e.preventDefault()` + `e.stopPropagation()` so clicking the
 * star doesn't fire a navigation.
 */
export default function ListingShortlistButton({
  slug,
  size = "md",
}: {
  slug: string;
  size?: "sm" | "md";
}) {
  const { has, toggle, count, max } = useListingShortlist();
  const saved = has(slug);
  const atCap = !saved && count >= max;

  const sizeClasses = size === "sm"
    ? "w-7 h-7 text-[12px]"
    : "w-8 h-8 text-[14px]";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (atCap) return;
        toggle(slug);
      }}
      disabled={atCap}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove from shortlist`
          : atCap
            ? `Shortlist full (max ${max})`
            : `Add to shortlist`
      }
      title={
        saved
          ? "Saved — click to remove"
          : atCap
            ? `Shortlist full (max ${max})`
            : "Save to compare"
      }
      className={`${sizeClasses} inline-flex items-center justify-center rounded-full shadow-sm backdrop-blur transition-colors ${
        saved
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : atCap
            ? "bg-white/80 text-slate-300 cursor-not-allowed"
            : "bg-white/95 text-slate-500 hover:bg-violet-50 hover:text-violet-600"
      }`}
    >
      <Icon name={saved ? "bookmark-check" : "bookmark"} size={size === "sm" ? 13 : 15} />
    </button>
  );
}

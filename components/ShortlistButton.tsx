"use client";

import { memo } from "react";
import { useShortlist } from "@/lib/hooks/useShortlist";
import { trackEvent } from "@/lib/tracking";

export default memo(function ShortlistButton({
  slug,
  name,
  size = "sm",
}: {
  slug: string;
  name: string;
  size?: "sm" | "md";
}) {
  const { toggle, has } = useShortlist();
  const saved = has(slug);
  const sizeClasses = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
        if (!saved) {
          trackEvent("shortlist_add", { broker: slug });
        }
      }}
      className={`${sizeClasses} flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
        saved
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
      }`}
      aria-label={saved ? `Remove ${name} from shortlist` : `Save ${name} to shortlist`}
      title={saved ? "Remove from My Brokers" : "Save to My Brokers"}
    >
      <svg
        className={iconSize}
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
});

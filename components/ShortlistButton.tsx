"use client";

import { memo } from "react";
import { useShortlist } from "@/lib/hooks/useShortlist";
import { celebrateSave } from "@/lib/celebrate";
import { trackEvent } from "@/lib/tracking";

/** Fired when the shortlist first reaches three platforms (D2). */
export const SHORTLIST_READY_EVENT = "iv-shortlist-ready";
const READY_SHOWN_KEY = "iv_shortlist_ready_shown";

export default memo(function ShortlistButton({
  slug,
  name,
  size = "sm",
}: {
  slug: string;
  name: string;
  size?: "sm" | "md";
}) {
  const { toggle, has, slugs } = useShortlist();
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
          celebrateSave({ saved: true, label: name });
          // Third comparable platform saved → "ready to decide" moment (D2),
          // shown once ever, handled by ShortlistReadySheet at the layout root.
          const nextSlugs = slugs.includes(slug) ? slugs : [...slugs, slug];
          try {
            if (nextSlugs.length === 3 && !localStorage.getItem(READY_SHOWN_KEY)) {
              localStorage.setItem(READY_SHOWN_KEY, new Date().toISOString());
              window.dispatchEvent(
                new CustomEvent(SHORTLIST_READY_EVENT, { detail: nextSlugs }),
              );
            }
          } catch {
            /* storage blocked — skip the moment, never the save */
          }
        } else {
          celebrateSave({ saved: false, label: name });
        }
      }}
      className={`${sizeClasses} flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
        saved
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-600"
      }`}
      aria-label={saved ? `Remove ${name} from shortlist` : `Save ${name} to shortlist`}
      title={saved ? "Remove from My Platforms" : "Save to My Platforms"}
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

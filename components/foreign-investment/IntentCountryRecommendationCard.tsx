"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Props {
  flag: string;
  audienceLabel: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}

/**
 * Interactive presentation layer for IntentCountryRecommendation.
 *
 * The server component resolves the user's intent country and decides
 * whether to render at all; this client component handles three things
 * that need browser state:
 *
 *   1. Self-dismissal once the recommendation has already been acted on
 *      (URL matches the CTA target — filter or pre-filtered destination
 *      already in effect). Without this, the card kept showing after
 *      "FIRB-eligible only" had been applied, which left users unsure
 *      whether the click had taken effect.
 *
 *   2. A confirmation animation on click — swap the CTA to a "✓ Applied"
 *      pill, then fade + collapse the card so the user can see the
 *      action took effect before the URL transition completes.
 *
 *   3. Soft client-side navigation that preserves scroll, so users stay
 *      anchored to the listings grid rather than getting bumped to top.
 */
export default function IntentCountryRecommendationCard({
  flag,
  audienceLabel,
  title,
  body,
  href,
  cta,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);

  // Already in the recommended state? Don't render at all. This catches
  // both query-param targets (/invest?firb=eligible) and pathname targets
  // (/compare/non-residents).
  if (matchesTarget(href, pathname, searchParams)) return null;

  const onApply = () => {
    if (applied) return;
    setApplied(true);
    // Run the route change inside a transition so the animation isn't
    // interrupted by Suspense boundaries flashing to fallbacks.
    setTimeout(() => {
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    }, 450);
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-out ${
        applied ? "opacity-0 max-h-0 my-0 scale-[0.98]" : "opacity-100 max-h-[400px] my-4 scale-100"
      }`}
      aria-hidden={applied}
    >
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-2xl leading-none mt-0.5">
              {flag}
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-0.5">
                Recommended for {audienceLabel}
              </p>
              <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-700 max-w-xl leading-snug">{body}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onApply}
            disabled={applied}
            className={`shrink-0 px-4 py-2 font-bold text-sm rounded-lg transition-all duration-300 ease-out ${
              applied
                ? "bg-emerald-500 text-white scale-105"
                : "bg-amber-500 hover:bg-amber-400 text-slate-900"
            }`}
            aria-live="polite"
          >
            {applied ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Applied
              </span>
            ) : (
              <>{cta} &rarr;</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function matchesTarget(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  // Parse against a dummy origin so URL accepts both "/foo?bar=baz" and
  // "/foo" without requiring an absolute href.
  const target = new URL(href, "https://x");

  if (target.pathname !== pathname) return false;

  // Every query param on the target must already be present and equal in
  // the current URL. Extra params on the current URL are fine (the user
  // may have layered other filters).
  for (const [key, value] of target.searchParams.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

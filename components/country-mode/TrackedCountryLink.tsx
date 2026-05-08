"use client";

/**
 * Country Mode tracked link — fires a country-dimensioned analytics
 * event before navigating. Used by the homepage preview wrappers
 * (CountryListingsPreview, CountryExpertsPreview, CountryComparePreview)
 * to capture click-through on country-tailored surfaces.
 *
 * Server components import this client component and pass props
 * server-side; the Next.js boundary handles the hand-off cleanly.
 */

import Link, { type LinkProps } from "next/link";
import type { ReactNode, MouseEvent } from "react";
import { trackEvent } from "@/lib/tracking";

export type CountryClickEvent =
  | "country_listing_click"
  | "country_expert_click"
  | "country_compare_click"
  | "country_tool_click";

interface TrackedCountryLinkProps extends LinkProps {
  /** Event name fired before navigation. */
  eventName: CountryClickEvent;
  /** Country dimension — intent code (e.g. "hk", "uk"). */
  country: string;
  /** Optional target dimension — slug, id, or other identifier. */
  targetId?: string | number;
  /**
   * Optional source dimension — which surface fired the click
   * (e.g. "homepage_preview", "see_all"). Lets analytics distinguish
   * card clicks from "see all opportunities" links.
   */
  source?: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function TrackedCountryLink({
  eventName,
  country,
  targetId,
  source,
  className,
  children,
  ariaLabel,
  ...linkProps
}: TrackedCountryLinkProps) {
  const handleClick = (_e: MouseEvent<HTMLAnchorElement>) => {
    // Fire-and-forget — trackEvent uses a beacon-style POST internally
    // and shouldn't block the navigation. If it throws, the click
    // still proceeds.
    try {
      trackEvent(eventName, {
        country,
        target: targetId ?? null,
        source: source ?? null,
      });
    } catch {
      /* swallow tracking failures */
    }
  };

  return (
    <Link
      {...linkProps}
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

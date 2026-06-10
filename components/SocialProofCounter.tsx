"use client";

/**
 * Social-proof counter — intentionally renders nothing.
 *
 * The previous implementation fabricated the "X investors compared
 * platforms today" figure from a time-of-day sine curve with a daily
 * variance — fake social proof on revenue pages (ACL s18 misleading-
 * conduct exposure, and a trust-killer the moment a visitor notices
 * the number is synthetic).
 *
 * Call sites are kept so this can be re-enabled by changing only this
 * file once a real source exists (e.g. a daily aggregate of compare
 * sessions from analytics_events). When wiring that up: show the real
 * count, and hide the element below a minimum threshold instead of
 * inventing a floor.
 */
export default function SocialProofCounter(_props: {
  variant?: "inline" | "badge";
}) {
  return null;
}

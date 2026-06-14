"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Homepage Country-Mode de-dupe.
 *
 * When a country-tailored strip (CountryListingsPreview / CountryExpertsPreview)
 * actually renders, its global counterpart (HomeListingsTeaser /
 * HomeAdvisorsTeaser) is redundant — a foreign-investor visitor was seeing two
 * "opportunities" / two "experts" sections. This wrapper hides the global one
 * when its matching strip is present on the page.
 *
 * Keyed off the *presence of the strip element* (`[data-country-strip]`), not
 * the cookie — so a country whose supply is too low (its strip returns null)
 * still shows the global teaser, with no empty gap. Purely client-side and via
 * a direct style toggle (no setState → no cascading render): the server render
 * and the homepage's ISR caching are unchanged; the global stays in the HTML
 * and is only collapsed after hydration when the strip exists.
 */
export default function HideWhenCountryStrip({
  strip,
  children,
}: {
  strip: "listings" | "experts";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.querySelector(`[data-country-strip="${strip}"]`)) {
      ref.current?.style.setProperty("display", "none");
    }
  }, [strip]);

  // display:contents → the wrapper itself adds no box, so the global section
  // lays out exactly as before; flipping to display:none collapses it cleanly.
  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}

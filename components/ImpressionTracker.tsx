"use client";

import { useEffect, useRef } from "react";
import { recordWinnerImpressions } from "@/lib/marketplace/frequency-cap";
import type { PlacementWinner } from "@/lib/sponsorship";

/**
 * Invisible component that fires server-side impression records
 * and updates the client-side frequency cap when winners are displayed.
 *
 * Uses IntersectionObserver so impressions are only logged when
 * the ad content is actually visible in the viewport (viewability tracking).
 *
 * Drop this next to any campaign-rendered content:
 *   <ImpressionTracker winners={winners} placement="homepage-featured" page="/" />
 */
export default function ImpressionTracker({
  winners,
  placement,
  page,
}: {
  winners: PlacementWinner[];
  placement: string;
  page: string;
}) {
  const sentRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sentRef.current || winners.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !sentRef.current) {
            sentRef.current = true;

            // Record client-side frequency cap
            recordWinnerImpressions(winners, placement);

            // Fire server-side impression for each winner
            for (const w of winners) {
              fetch("/api/marketplace/impression", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  campaign_id: w.campaign_id,
                  broker_slug: w.broker_slug,
                  page,
                  placement,
                }),
              }).catch(() => {
                // Non-critical — swallow errors silently
              });
            }

            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 } // At least 50% visible
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [winners, placement, page]);

  // Invisible 1px marker element — placed next to campaign content
  return <div ref={observerRef} aria-hidden="true" className="w-0 h-0" />;
}

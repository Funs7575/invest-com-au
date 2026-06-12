"use client";

/**
 * Fires the `first_article` milestone after genuine dwell on an article
 * (25s with the tab visible) — "read", not merely "opened". Renders
 * nothing; mount once on article pages.
 */

import { useEffect } from "react";
import { fireJourneyMoment } from "@/components/journey/journeyMoment";

const DWELL_MS = 25_000;

export default function ArticleJourneyPing() {
  useEffect(() => {
    let elapsed = 0;
    let last = Date.now();
    const tick = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible") {
        elapsed += now - last;
        if (elapsed >= DWELL_MS) {
          window.clearInterval(tick);
          fireJourneyMoment("first_article");
        }
      }
      last = now;
    }, 1_000);
    return () => window.clearInterval(tick);
  }, []);

  return null;
}

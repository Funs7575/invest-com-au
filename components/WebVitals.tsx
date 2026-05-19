"use client";

import { useReportWebVitals } from "next/web-vitals";
import { logger } from "@/lib/logger";

const log = logger("web-vitals");

/**
 * Reports Core Web Vitals (CLS, LCP, INP, FCP, TTFB) to our own
 * /api/track-event endpoint. Logged in development for debugging.
 *
 * Mounted via components/LayoutSideEffects.tsx (lazy-loaded after
 * hydration so this telemetry doesn't compete with LCP work).
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    const { name, value, id, rating } = metric;

    // Log in development for debugging (logger filters debug-level out in prod)
    if (process.env.NODE_ENV === "development") {
      log.debug(`${name}: ${Math.round(value * 100) / 100} (${rating})`, {
        metric: name,
        value: Math.round(value * 100) / 100,
        rating,
      });
    }

    // Send to our own analytics endpoint (non-blocking).
    // Previously also dispatched to `window.gtag` when present — GA4
    // was removed in TT-04 and the branch was dead code from then on.
    if (process.env.NODE_ENV === "production") {
      fetch("/api/track-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "web_vital",
          page: window.location.pathname,
          metadata: {
            metric: name,
            value: Math.round(value * 100) / 100,
            rating,
            id,
          },
        }),
        keepalive: true,
      }).catch(() => {});
    }
  });

  return null;
}

"use client";

import { useReportWebVitals } from "next/web-vitals";
import { logger } from "@/lib/logger";
import { getSessionId } from "@/lib/session";

const log = logger("web-vitals");

/**
 * Reports Core Web Vitals (CLS, LCP, INP, FCP, TTFB) to our dedicated
 * /api/web-vitals beacon endpoint. Logged in development for debugging.
 *
 * Mounted via components/LayoutSideEffects.tsx (lazy-loaded after
 * hydration so this telemetry doesn't compete with LCP work).
 *
 * The beacon body shape ({ metric, value, page_path, session_id }) is
 * validated server-side by app/api/web-vitals/route.ts. We previously
 * POSTed to /api/track-event with event_type "web_vital", which that
 * route's ALLOWED_EVENTS never permitted — every beacon 400'd and all
 * field data was dropped.
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    const { name, value, rating } = metric;

    // Log in development for debugging (logger filters debug-level out in prod)
    if (process.env.NODE_ENV === "development") {
      log.debug(`${name}: ${Math.round(value * 100) / 100} (${rating})`, {
        metric: name,
        value: Math.round(value * 100) / 100,
        rating,
      });
    }

    // Send to our dedicated web-vitals beacon (non-blocking, keepalive so
    // it survives page-transition unloads). Send the raw value — the route
    // stores the sample as-is and classifies the rating server-side.
    // Previously also dispatched to `window.gtag` when present — GA4
    // was removed in TT-04 and the branch was dead code from then on.
    if (process.env.NODE_ENV === "production") {
      fetch("/api/web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: name,
          value,
          page_path: window.location.pathname,
          session_id: getSessionId(),
        }),
        keepalive: true,
      }).catch(() => {});
    }
  });

  return null;
}

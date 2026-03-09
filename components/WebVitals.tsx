"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reports Core Web Vitals (CLS, LCP, INP, FCP, TTFB) to analytics.
 *
 * Metrics are sent to Google Analytics (if available) via the gtag event
 * and logged in development for debugging.
 *
 * Include this component once in the root layout inside a Suspense boundary.
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    const { name, value, id, rating } = metric;

    // Log in development for debugging
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[Web Vital] ${name}: ${Math.round(value * 100) / 100} (${rating})`);
    }

    // Send to Google Analytics if gtag is available
    if (typeof window !== "undefined" && "gtag" in window) {
      const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
      gtag("event", name, {
        event_category: "Web Vitals",
        event_label: id,
        value: Math.round(name === "CLS" ? value * 1000 : value),
        non_interaction: true,
      });
    }

    // Send to our own analytics endpoint (non-blocking)
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

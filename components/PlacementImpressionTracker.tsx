"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a single impression event + binds delegated click handling for an
 * active placement experiment. Mounted by `/best/[slug]/page.tsx` once
 * `getActivePlacementExperiment(slug)` returns a live row.
 *
 * Impression dedupe: a sessionStorage marker keyed by
 * `pe:${experimentId}:${variant}:${pathname}` ensures we don't double-bill
 * impressions when the visitor navigates back to the same page in the
 * same tab. Resets per tab close.
 *
 * Click tracking: delegated click listener on `data-pe-experiment-id`
 * elements. Server-rendered affiliate buttons inside the experiment-wrapped
 * region get those data attributes so this listener catches them without
 * intercepting unrelated clicks elsewhere on the page.
 *
 * Best-effort: every fetch uses `keepalive: true` so it survives navigation,
 * and all errors are swallowed. Tracking is never allowed to break the page.
 */
export default function PlacementImpressionTracker({
  experimentId,
  variant,
}: {
  experimentId: number;
  variant: string;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const key = `pe:${experimentId}:${variant}:${pathname}`;

    let alreadySent = false;
    try {
      alreadySent = window.sessionStorage.getItem(key) === "1";
    } catch {
      // Storage may be unavailable (private mode / quota); proceed and
      // accept potential double-count rather than fail closed.
    }

    if (!alreadySent) {
      try {
        window.sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }

      void fetch("/api/placement-experiment/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment_id: experimentId,
          variant,
          event_type: "impressions",
        }),
        keepalive: true,
      }).catch(() => {
        /* swallow */
      });
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest<HTMLElement>("[data-pe-experiment-id]");
      if (!anchor) return;
      const expIdAttr = anchor.getAttribute("data-pe-experiment-id");
      const variantAttr = anchor.getAttribute("data-pe-variant");
      if (!expIdAttr || !variantAttr) return;
      const expIdNum = Number(expIdAttr);
      if (!Number.isFinite(expIdNum) || expIdNum <= 0) return;

      void fetch("/api/placement-experiment/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment_id: expIdNum,
          variant: variantAttr,
          event_type: "clicks",
        }),
        keepalive: true,
      }).catch(() => {
        /* swallow */
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [experimentId, variant]);

  return null;
}

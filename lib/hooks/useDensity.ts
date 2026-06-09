"use client";

import { useCallback, useEffect, useState } from "react";

export type Density = "comfy" | "compact";

/**
 * Result-density preference (Comfy vs Compact) for directory result grids.
 *
 * A personal *viewing* preference rather than a shareable filter, so it's
 * persisted in `localStorage` (not the URL) and shared across directory
 * surfaces (`/advisors`, `/invest`) via a common storage key. SSR-safe:
 * renders the default ("comfy") on first paint, then syncs from storage on
 * mount — avoiding a hydration mismatch at the cost of a one-frame settle.
 */
export function useDensity(storageKey = "iv-density"): [Density, (d: Density) => void] {
  const [density, setDensityState] = useState<Density>("comfy");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      // One-time hydration of a client-only preference after mount; the SSR
      // render intentionally uses the "comfy" default to avoid a mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      if (stored === "compact" || stored === "comfy") setDensityState(stored);
    } catch {
      /* localStorage unavailable (private mode / SSR) — keep the default */
    }
  }, [storageKey]);

  const setDensity = useCallback(
    (d: Density) => {
      setDensityState(d);
      try {
        localStorage.setItem(storageKey, d);
      } catch {
        /* ignore persistence failures */
      }
    },
    [storageKey],
  );

  return [density, setDensity];
}

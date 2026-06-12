"use client";

/**
 * `useFirstTime(key)` — localStorage-backed "is this the first time this
 * person has done X on this device?" flag for delight moments (first
 * watchlist save, first comparison, …).
 *
 * Deliberately device-local and forgiving: clearing storage replays the
 * moment, which is fine — celebrations must never gate functionality.
 * SSR-safe (resolves after mount so server and first client render agree).
 *
 * Usage:
 *   const firstSave = useFirstTime("watchlist_save");
 *   …on success: if (firstSave.isFirst) { celebrate(); firstSave.markDone(); }
 */

import { useCallback, useEffect, useState } from "react";

const PREFIX = "iv_first_";

export function useFirstTime(key: string): {
  /** True once we know storage has no record. False during SSR/first paint. */
  isFirst: boolean;
  markDone: () => void;
} {
  const [isFirst, setIsFirst] = useState(false);

  useEffect(() => {
    try {
      setIsFirst(window.localStorage.getItem(PREFIX + key) === null);
    } catch {
      /* private browsing / storage denied — never celebrate, never break */
    }
  }, [key]);

  const markDone = useCallback(() => {
    setIsFirst(false);
    try {
      window.localStorage.setItem(PREFIX + key, new Date().toISOString());
    } catch {
      /* ignore */
    }
  }, [key]);

  return { isFirst, markDone };
}

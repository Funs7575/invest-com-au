"use client";

/* eslint-disable react-hooks/set-state-in-effect -- mirror of useAdvisorShortlist; cross-tab + initial-hydrate setState in useEffect is the established pattern. */

/**
 * Per-listing shortlist (bookmark) for /invest. Mirrors the shape of
 * useAdvisorShortlist so the call sites + sticky compare bar look the
 * same across the two surfaces.
 *
 * Persistence:
 *   - Anonymous: localStorage under STORAGE_KEY (survives reloads,
 *     scoped per-browser).
 *   - Authenticated: a follow-on PR can wire a /api/account/bookmarks
 *     sync (server has the user_bookmarks table with bookmark_type +
 *     ref columns). For Wave 2 we ship the local-storage path; the
 *     server sync is a deliberate Wave 3 follow-up.
 *
 * Cross-tab + cross-component sync via a window CustomEvent so the
 * sticky compare bar updates the moment a card is bookmarked anywhere
 * on the page.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "invest_listing_shortlist_v1";
const MAX_SHORTLIST = 4;
const EVENT_NAME = "invest-listing-shortlist-change";

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function useListingShortlist() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    setSlugs(readStored());
  }, []);

  const persist = useCallback((next: string[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — silently ignore */
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      let next: string[];
      if (prev.includes(slug)) {
        next = prev.filter((s) => s !== slug);
      } else if (prev.length >= MAX_SHORTLIST) {
        // Hit the cap — leave state as-is. UI shows the cap message.
        return prev;
      } else {
        next = [...prev, slug];
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const clear = useCallback(() => {
    setSlugs([]);
    persist([]);
  }, [persist]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setSlugs(detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return { slugs, count: slugs.length, toggle, has, clear, max: MAX_SHORTLIST };
}

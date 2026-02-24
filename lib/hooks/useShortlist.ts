"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "invest_shortlist";
const MAX_SHORTLIST = 8;

export function useShortlist() {
  const [slugs, setSlugs] = useState<string[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSlugs(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent("shortlist-change", { detail: next }));
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length >= MAX_SHORTLIST
          ? prev
          : [...prev, slug];
      persist(next);
      return next;
    });
  }, [persist]);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const clear = useCallback(() => {
    setSlugs([]);
    persist([]);
  }, [persist]);

  // Listen for changes from other components/tabs
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setSlugs(detail);
    };
    window.addEventListener("shortlist-change", handler);
    return () => window.removeEventListener("shortlist-change", handler);
  }, []);

  return { slugs, count: slugs.length, toggle, has, clear };
}

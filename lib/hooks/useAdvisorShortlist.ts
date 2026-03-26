"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "invest_advisor_shortlist";
const MAX_SHORTLIST = 4;

export function useAdvisorShortlist() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSlugs(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent("advisor-shortlist-change", { detail: next }));
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      setSlugs((prev) => {
        const next = prev.includes(slug)
          ? prev.filter((s) => s !== slug)
          : prev.length >= MAX_SHORTLIST
            ? prev
            : [...prev, slug];
        persist(next);
        return next;
      });
    },
    [persist],
  );

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
    window.addEventListener("advisor-shortlist-change", handler);
    return () => window.removeEventListener("advisor-shortlist-change", handler);
  }, []);

  return { slugs, count: slugs.length, toggle, has, clear, max: MAX_SHORTLIST };
}

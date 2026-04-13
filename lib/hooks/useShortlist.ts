"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "./useUser";

const STORAGE_KEY = "invest_shortlist";
const MAX_SHORTLIST = 8;

/** Dedupe + clamp a slug list to the per-user max. */
function normalize(list: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    if (typeof s !== "string" || !s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_SHORTLIST) break;
  }
  return out;
}

export function useShortlist() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const { user, loading: userLoading } = useUser();
  const syncedForUser = useRef<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSlugs(normalize(parsed));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Sync with Supabase when the user logs in. Merges any unsaved
  // localStorage picks with the server-side list so switching devices
  // (or signing up mid-session) never drops entries.
  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      syncedForUser.current = null;
      return;
    }
    if (syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sync-shortlist");
        if (!res.ok) return;
        const data = await res.json();
        const remote: string[] = Array.isArray(data?.slugs) ? data.slugs : [];

        // Read local fresh (state may have been rehydrated async)
        let local: string[] = [];
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) local = parsed;
          }
        } catch {
          // ignore
        }

        // Merge: remote first (to preserve added_at order), then any
        // local-only additions the user made while logged out.
        const merged = normalize([...remote, ...local]);

        if (cancelled) return;
        setSlugs(merged);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        window.dispatchEvent(new CustomEvent("shortlist-change", { detail: merged }));

        // Push merged list back to server if it differs from what we fetched,
        // so a device that had unsaved local entries uploads them.
        const differs =
          merged.length !== remote.length ||
          merged.some((s, i) => s !== remote[i]);
        if (differs) {
          fetch("/api/sync-shortlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slugs: merged }),
          }).catch(() => {});
        }
      } catch {
        // Non-fatal — user keeps local-only shortlist
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  const persist = useCallback((next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent("shortlist-change", { detail: next }));

    // If logged in, persist to Supabase too. Fire-and-forget — the local
    // state is already updated, so UI stays responsive; the server write
    // runs in the background and surfaces errors only to the console.
    if (user) {
      fetch("/api/sync-shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: next }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [user]);

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

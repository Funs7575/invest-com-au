"use client";

import { useCallback } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

export interface UseDirectoryParams {
  /** The current, read-only query params. Derive filter state from this. */
  params: ReadonlyURLSearchParams;
  /**
   * Set or delete params, then `router.replace` the current path with the
   * updated query string. A falsy value deletes the key. Writes are
   * immediate (no debounce) and never push a new history entry, so the
   * Back button steps through real navigations rather than keystrokes.
   */
  setParams: (updates: Record<string, string>) => void;
  /**
   * Delete the given keys (preserving any others). With no argument the
   * whole query string is dropped.
   */
  clearParams: (keys?: string[]) => void;
}

/**
 * URL-first state for directory pages — the shared mechanism behind the
 * `/invest` and `/advisors` filter chrome. The URL query string is the
 * single source of truth: components derive their filter state from
 * `params` and mutate it through `setParams` / `clearParams`, which keeps
 * Back/Forward, deep-linking, and share-able URLs working for free.
 */
export function useDirectoryParams(): UseDirectoryParams {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const replaceWith = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      replaceWith(next);
    },
    [params, replaceWith],
  );

  const clearParams = useCallback(
    (keys?: string[]) => {
      if (!keys) {
        replaceWith(new URLSearchParams());
        return;
      }
      const next = new URLSearchParams(params.toString());
      for (const key of keys) next.delete(key);
      replaceWith(next);
    },
    [params, replaceWith],
  );

  return { params, setParams, clearParams };
}

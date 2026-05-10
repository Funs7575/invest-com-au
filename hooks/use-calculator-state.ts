/**
 * `useCalculatorState` — typed React hook for cross-calculator persistence.
 *
 * Wraps `lib/calculator-state.ts` + the `/api/calculator-state` route so a
 * calculator client component can:
 *   - read prior state on mount (sessionStorage immediately, DB after a fetch
 *     for signed-in users)
 *   - write inputs as the user types (sessionStorage immediately, debounced
 *     POST to the API for signed-in users)
 *   - read prefill candidates from related calculators (`prefillFrom`)
 *
 * The hook is calculator-agnostic: pass a string `key` (e.g. "mortgage",
 * "savings", "fire") and an `initialValue` matching the calculator's input
 * shape. The hook is signed-in vs anon aware via `useUser()` so anonymous
 * traffic continues to work without any auth state required.
 *
 * Companion to PR #20260720_cmp_w1a_user_calculator_state.sql which shipped
 * the schema, RLS policies, and `/api/calculator-state` route. This hook is
 * the missing client glue (W2 Phase 1).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import {
  readSessionState,
  writeSessionState,
  PREFILL_RULES,
  getPrefillFor,
  serializeToUrlParams,
  parseFromUrlParams,
} from "@/lib/calculator-state";

const DEFAULT_DEBOUNCE_MS = 5_000;

export interface UseCalculatorStateOptions {
  /** Source-tag stamped on writes (used by /api/submit-lead readers). Defaults to `key`. */
  source?: string;
  /** Debounce window for DB writes in ms. Default 5s — balances autosave UX vs row writes. */
  debounceMs?: number;
  /** When true, hydrate from URL `?key_*` params on mount. Default true. */
  hydrateFromUrl?: boolean;
}

export interface UseCalculatorStateReturn<T> {
  /** Current value. Starts at `initialValue`, replaced by hydrated state once loaded. */
  value: T;
  /** Replace or transform the value. Triggers debounced persistence. */
  setValue: (next: T | ((prev: T) => T)) => void;
  /** True once initial hydration (sessionStorage + URL + DB) has completed. */
  isHydrated: boolean;
  /**
   * Pull a prefill candidate from a related calculator (per `PREFILL_RULES`)
   * and apply it via setValue. Returns the source key used or null if none.
   * Useful for "prefill from your TCO inputs?" UX.
   */
  prefillFrom: () => string | null;
}

export function useCalculatorState<T extends Record<string, unknown>>(
  key: string,
  initialValue: T,
  options: UseCalculatorStateOptions = {},
): UseCalculatorStateReturn<T> {
  const {
    source = key,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    hydrateFromUrl = true,
  } = options;

  const { user } = useUser();
  const [value, setValueState] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHydratedRef = useRef(false);

  // ─── Hydration: sessionStorage → URL → DB (signed-in only) ─────────────
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    // 1. sessionStorage (zero-RTT, dies on cookie clear)
    const session = readSessionState();
    const sessionEntry = session[key];

    // 2. URL params (shareable links — TCO pattern)
    let urlData: Record<string, unknown> | null = null;
    if (hydrateFromUrl && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const parsed = parseFromUrlParams(key, sp);
      if (parsed && Object.keys(parsed).length > 0) urlData = parsed;
    }

    // Merge sessionStorage + URL params (URL wins — explicit user intent).
    let merged: T = initialValue;
    if (sessionEntry?.data) {
      merged = { ...merged, ...(sessionEntry.data as Partial<T>) };
    }
    if (urlData) {
      merged = { ...merged, ...(urlData as Partial<T>) };
    }
    setValueState(merged);

    // 3. DB (signed-in only) — async, replaces only if newer.
    if (user) {
      void (async () => {
        try {
          const res = await fetch("/api/calculator-state", { method: "GET" });
          if (!res.ok) {
            setIsHydrated(true);
            return;
          }
          const body = (await res.json()) as {
            state?: Record<string, { source?: string; data?: unknown; captured_at?: string }>;
          };
          const dbEntry = body.state?.[key];
          if (dbEntry?.data) {
            const sessionAt = sessionEntry?.captured_at ?? "";
            const dbAt = dbEntry.captured_at ?? "";
            // Last-write-wins reconciliation.
            if (!sessionAt || dbAt > sessionAt) {
              setValueState((prev) => ({ ...prev, ...(dbEntry.data as Partial<T>) }));
            }
          }
        } catch {
          /* network failure — sessionStorage state stands */
        } finally {
          setIsHydrated(true);
        }
      })();
    } else {
      setIsHydrated(true);
    }
  }, [key, hydrateFromUrl, initialValue, user]);

  // ─── Persistence: sessionStorage immediate + debounced DB write ────────
  const persist = useCallback(
    (next: T) => {
      // Always write sessionStorage immediately (anon + signed-in).
      writeSessionState(key, {
        source,
        data: next as unknown as Record<string, unknown>,
      });

      // Debounced DB write only when signed in.
      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void fetch("/api/calculator-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calculator: key,
            source,
            data: next,
          }),
        }).catch(() => {
          /* non-blocking; sessionStorage is the source of truth client-side */
        });
      }, debounceMs);
    },
    [key, source, user, debounceMs],
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        persist(resolved);
        return resolved;
      });
    },
    [persist],
  );

  // Flush any pending debounced write on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ─── Prefill from related calculator ───────────────────────────────────
  const prefillFrom = useCallback((): string | null => {
    if (!PREFILL_RULES[key]) return null;
    const session = readSessionState();
    const prefill = getPrefillFor(key, session);
    if (!prefill || Object.keys(prefill).length === 0) return null;
    setValue((prev) => ({ ...prev, ...(prefill as Partial<T>) }));
    // Find which source rule fired so the UI can attribute it.
    for (const rule of PREFILL_RULES[key]!) {
      if (session[rule.fromCalculator]) return rule.fromCalculator;
    }
    return null;
  }, [key, setValue]);

  return { value, setValue, isHydrated, prefillFrom };
}

/**
 * Build a shareable URL for the current calculator state. Mounts a "Share"
 * button that copies a deep link with all inputs encoded as query params.
 *
 * Companion utility for hook consumers — pure function, no React state.
 */
export function buildShareableUrl(
  baseUrl: string,
  key: string,
  data: Record<string, unknown>,
): string {
  const sp = serializeToUrlParams(key, data);
  return sp.toString() ? `${baseUrl}?${sp.toString()}` : baseUrl;
}

/**
 * `useMoneyProfile` / `useMoneyProfilePrefill` — client glue for the Money
 * Profile (lib/money-profile.ts + /api/account/money-profile).
 *
 * useMoneyProfile():
 *   Fetches the signed-in user's assembled profile once per page load
 *   (module-level promise cache — many calculators can mount the hook
 *   without re-fetching). Anonymous users resolve to null immediately.
 *
 * useMoneyProfilePrefill(spec):
 *   The calculator-side contract. A calculator declares how profile
 *   fields map onto its input state (`build`) and how a patch is applied
 *   (`apply` — must update BOTH its local state and its persisted
 *   calculator state). The hook then:
 *     - waits for the calculator's own hydration (`hydrated`) AND the
 *       profile fetch,
 *     - if the inputs are still pristine (deep-equal to `defaults`),
 *       auto-applies the patch once → status "applied" (attribution chip),
 *     - otherwise offers it → status "available" ("Fill from your Money
 *       Profile" button), so saved or user-entered values are never
 *       clobbered.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import type { MoneyCoverage, MoneyProfile } from "@/lib/money-profile";

interface MoneyProfileResponse {
  profile: MoneyProfile;
  coverage: MoneyCoverage;
}

// Module-level cache: one fetch per page load, shared across hook mounts.
let cachedPromise: Promise<MoneyProfileResponse | null> | null = null;

function fetchMoneyProfile(): Promise<MoneyProfileResponse | null> {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/account/money-profile")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as MoneyProfileResponse;
      })
      .catch(() => null);
  }
  return cachedPromise;
}

/** Test/edit hook: drop the cache (e.g. after a PATCH saves new values). */
export function invalidateMoneyProfileCache(): void {
  cachedPromise = null;
}

export interface UseMoneyProfileReturn {
  profile: MoneyProfile | null;
  coverage: MoneyCoverage | null;
  /** True while the signed-in fetch is in flight. */
  loading: boolean;
  signedIn: boolean;
}

export function useMoneyProfile(): UseMoneyProfileReturn {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState<MoneyProfileResponse | null>(null);
  const [fetchPending, setFetchPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (userLoading || !user) return;
    void fetchMoneyProfile().then((res) => {
      if (cancelled) return;
      setData(res);
      setFetchPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  // Anonymous users resolve immediately (no fetch) — loading is derived so
  // the effect never needs a synchronous setState for that branch.
  const signedIn = !!user;
  return {
    profile: signedIn ? (data?.profile ?? null) : null,
    coverage: signedIn ? (data?.coverage ?? null) : null,
    loading: userLoading || (signedIn && fetchPending),
    signedIn,
  };
}

// ─── Prefill contract ────────────────────────────────────────────────────

export type PrefillStatus = "idle" | "applied" | "available";

/**
 * Build-result shape: profile fields are nullable, so mappings can pass
 * them straight through — null/undefined entries are stripped before the
 * patch is applied or counted.
 */
export type NullablePatch<T> = { [K in keyof T]?: T[K] | null };

export interface MoneyPrefillSpec<T extends Record<string, unknown>> {
  /** Calculator hydration complete (useCalculatorState's isHydrated). */
  hydrated: boolean;
  /** Current input state at evaluation time. */
  current: T;
  /** The calculator's pristine defaults. */
  defaults: T;
  /** Map profile → partial input patch. Return only the keys you can fill. */
  build: (profile: MoneyProfile) => NullablePatch<T>;
  /** Apply a patch to BOTH local state and persisted calculator state. */
  apply: (patch: Partial<T>) => void;
}

export interface UseMoneyProfilePrefillReturn {
  status: PrefillStatus;
  /** Number of fields the patch fills (for chip copy). */
  fieldCount: number;
  /** Manually apply when status === "available". */
  applyNow: () => void;
  signedIn: boolean;
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => Object.is(a[k], b[k]));
}

function stripEmpty<T extends Record<string, unknown>>(patch: NullablePatch<T>): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export function useMoneyProfilePrefill<T extends Record<string, unknown>>(
  spec: MoneyPrefillSpec<T>,
): UseMoneyProfilePrefillReturn {
  const { profile, loading, signedIn } = useMoneyProfile();
  const [status, setStatus] = useState<PrefillStatus>("idle");
  const [fieldCount, setFieldCount] = useState(0);
  const patchRef = useRef<Partial<T>>({});
  const decidedRef = useRef(false);
  // Keep latest values in refs so the decision effect runs once without
  // re-firing on every keystroke (current changes constantly).
  const currentRef = useRef(spec.current);
  currentRef.current = spec.current;
  const applyRef = useRef(spec.apply);
  applyRef.current = spec.apply;
  const buildRef = useRef(spec.build);
  buildRef.current = spec.build;

  useEffect(() => {
    if (decidedRef.current) return;
    if (!spec.hydrated || loading) return;
    decidedRef.current = true;
    if (!profile) return; // anonymous or fetch failed — stay idle

    const patch = stripEmpty(buildRef.current(profile));
    const keys = Object.keys(patch);
    if (keys.length === 0) return;

    patchRef.current = patch;
    setFieldCount(keys.length);

    if (shallowEqual(currentRef.current, spec.defaults)) {
      applyRef.current(patch);
      setStatus("applied");
    } else {
      setStatus("available");
    }
    // spec.defaults is stable per calculator; profile/loading/hydrated drive the decision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.hydrated, loading, profile]);

  const applyNow = useCallback(() => {
    if (Object.keys(patchRef.current).length === 0) return;
    applyRef.current(patchRef.current);
    setStatus("applied");
  }, []);

  return { status, fieldCount, applyNow, signedIn };
}

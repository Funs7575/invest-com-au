/**
 * `useLearningPathProgress` — per-path step-completion tracking.
 *
 * Persistence strategy mirrors `useCalculatorState`:
 *   - Anonymous users: localStorage only (survives tab closes, cleared on cookie clear)
 *   - Signed-in users: localStorage + debounced write-through to
 *     `user_calculator_state` (key: "learning_path_progress") via
 *     the existing /api/calculator-state route.
 *
 * This keeps the feature zero-schema-migration: we store the progress
 * blob as a nested key inside the `user_calculator_state.state` JSONB
 * column that already exists and has RLS.
 *
 * Data shape stored in the calculator-state slot:
 *   key: "learning_path_progress"
 *   data: {
 *     [pathSlug]: {
 *       completedStepIndices: number[],   // 0-indexed step positions
 *       startedAt: string,                // ISO timestamp
 *       lastActivityAt: string,           // ISO timestamp
 *     }
 *   }
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PathProgress {
  completedStepIndices: number[];
  startedAt: string;
  lastActivityAt: string;
}

export type AllPathProgress = Record<string, PathProgress>;

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = "learning_path_progress:v1";

function readLocalProgress(): AllPathProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as AllPathProgress;
  } catch {
    return {};
  }
}

function writeLocalProgress(next: AllPathProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded — silently ignore
  }
}

// ─── Remote (DB) helpers via /api/calculator-state ───────────────────────────

const CALC_KEY = "learning_path_progress";
const DEBOUNCE_MS = 4_000;

async function fetchRemoteProgress(): Promise<AllPathProgress | null> {
  try {
    const res = await fetch("/api/calculator-state", { method: "GET" });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      state?: Record<
        string,
        { data?: unknown; captured_at?: string } | undefined
      >;
    };
    const entry = body.state?.[CALC_KEY];
    if (!entry?.data || typeof entry.data !== "object") return null;
    return entry.data as AllPathProgress;
  } catch {
    return null;
  }
}

async function pushRemoteProgress(all: AllPathProgress): Promise<void> {
  try {
    await fetch("/api/calculator-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calculator: CALC_KEY,
        source: "learning-path-ui",
        data: all,
      }),
    });
  } catch {
    // non-blocking — localStorage is the source of truth client-side
  }
}

// ─── Merge helper (last-activity wins per path) ───────────────────────────────

function mergeProgress(
  local: AllPathProgress,
  remote: AllPathProgress
): AllPathProgress {
  const merged: AllPathProgress = { ...local };
  for (const pathSlug of Object.keys(remote)) {
    const r = remote[pathSlug];
    if (!r) continue;
    const l = local[pathSlug];
    if (!l) {
      merged[pathSlug] = r;
    } else {
      // Keep the one with more recent lastActivityAt
      merged[pathSlug] =
        new Date(r.lastActivityAt) > new Date(l.lastActivityAt) ? r : l;
    }
  }
  return merged;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseLearningPathProgressReturn {
  /** Set of completed step indices (0-based) for this path */
  completedIndices: Set<number>;
  /** Number of completed steps */
  completedCount: number;
  /** True once initial hydration has completed */
  isHydrated: boolean;
  /** Mark a step complete (idempotent) */
  markComplete: (stepIndex: number) => void;
  /** Mark a step incomplete */
  markIncomplete: (stepIndex: number) => void;
  /** True if the step is marked complete */
  isComplete: (stepIndex: number) => boolean;
  /** Reset all progress for this path */
  resetProgress: () => void;
}

export function useLearningPathProgress(
  pathSlug: string,
  totalSteps: number
): UseLearningPathProgressReturn {
  const { user } = useUser();
  const [allProgress, setAllProgress] = useState<AllPathProgress>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  // ─── Hydration (localStorage + DB) ────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const local = readLocalProgress();
    setAllProgress(local);

    if (user) {
      void (async () => {
        try {
          const remote = await fetchRemoteProgress();
          if (remote) {
            const merged = mergeProgress(local, remote);
            setAllProgress(merged);
            writeLocalProgress(merged);
          }
        } catch {
          // network failure — localStorage state stands
        } finally {
          setIsHydrated(true);
        }
      })();
    } else {
      setIsHydrated(true);
    }
  }, [user]);

  // ─── Persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(
    (next: AllPathProgress) => {
      writeLocalProgress(next);

      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void pushRemoteProgress(next);
      }, DEBOUNCE_MS);
    },
    [user]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Mutators ──────────────────────────────────────────────────────────────
  const markComplete = useCallback(
    (stepIndex: number) => {
      setAllProgress((prev) => {
        const existing = prev[pathSlug];
        const now = new Date().toISOString();
        const current = existing?.completedStepIndices ?? [];
        if (current.includes(stepIndex)) return prev; // idempotent
        const next: AllPathProgress = {
          ...prev,
          [pathSlug]: {
            completedStepIndices: [...current, stepIndex],
            startedAt: existing?.startedAt ?? now,
            lastActivityAt: now,
          },
        };
        persist(next);
        return next;
      });
    },
    [pathSlug, persist]
  );

  const markIncomplete = useCallback(
    (stepIndex: number) => {
      setAllProgress((prev) => {
        const existing = prev[pathSlug];
        if (!existing) return prev;
        const next: AllPathProgress = {
          ...prev,
          [pathSlug]: {
            ...existing,
            completedStepIndices: existing.completedStepIndices.filter(
              (i) => i !== stepIndex
            ),
            lastActivityAt: new Date().toISOString(),
          },
        };
        persist(next);
        return next;
      });
    },
    [pathSlug, persist]
  );

  const resetProgress = useCallback(() => {
    setAllProgress((prev) => {
      const next = { ...prev };
      delete next[pathSlug];
      persist(next);
      return next;
    });
  }, [pathSlug, persist]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const thisPath = allProgress[pathSlug];
  const completedIndices = new Set<number>(
    thisPath?.completedStepIndices ?? []
  );
  const completedCount = completedIndices.size;

  const isComplete = useCallback(
    (stepIndex: number) => completedIndices.has(stepIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedIndices, totalSteps]
  );

  return {
    completedIndices,
    completedCount,
    isHydrated,
    markComplete,
    markIncomplete,
    isComplete,
    resetProgress,
  };
}

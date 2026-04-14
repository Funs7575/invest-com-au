/**
 * Form state persistence hook.
 *
 * Drop into any React form component to auto-save in-progress
 * values to localStorage under a stable key. Restores on mount
 * so an accidental refresh / tab close doesn't wipe the user's
 * work.
 *
 * Usage:
 *
 *     const [form, setForm] = usePersistentForm("advisor-apply", {
 *       name: "",
 *       email: "",
 *       experience: "",
 *     });
 *
 *     // form and setForm work just like useState, but every update
 *     // is also written to localStorage. Call form.reset() to wipe.
 *
 * Safety:
 *   - Strips PII fields from persisted data (configurable via
 *     `sensitiveFields`) so we don't leave passwords or tokens in
 *     localStorage. Default blacklist covers password / token /
 *     secret / card / cvv / ssn / tfn.
 *   - Scoped per form via a `formKey` — different forms don't
 *     collide
 *   - Versioned — if the form schema changes, bump `version` and
 *     old persisted state is discarded on load
 *   - TTL — persisted state older than `maxAgeHours` (default 72)
 *     is treated as expired and cleared
 */

import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /card/i,
  /cvv/i,
  /ssn/i,
  /tfn/i,
  /account_?number/i,
  /bsb/i,
];

export interface PersistentFormOptions<T extends Record<string, unknown>> {
  /** Per-form namespace so two different forms don't collide */
  formKey: string;
  /** Bump to invalidate any persisted state from an older schema */
  version?: number;
  /** Hours before we drop persisted data. Default 72. */
  maxAgeHours?: number;
  /** Extra sensitive field names on top of the defaults */
  sensitiveFields?: Array<keyof T>;
}

export interface PersistentFormResult<T extends Record<string, unknown>> {
  value: T;
  setValue: (update: Partial<T> | ((prev: T) => T)) => void;
  reset: () => void;
  /** True once the initial load-from-storage has run */
  hydrated: boolean;
}

function scrub<T extends Record<string, unknown>>(
  value: T,
  extraSensitive: Array<keyof T>,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(value)) {
    const key = k as keyof T;
    const looksSensitive =
      extraSensitive.includes(key) ||
      DEFAULT_SENSITIVE_PATTERNS.some((p) => p.test(k));
    if (!looksSensitive) out[key] = v as T[keyof T];
  }
  return out;
}

export function usePersistentForm<T extends Record<string, unknown>>(
  initial: T,
  options: PersistentFormOptions<T>,
): PersistentFormResult<T> {
  const {
    formKey,
    version = 1,
    maxAgeHours = 72,
    sensitiveFields = [],
  } = options;
  const storageKey = `form:${formKey}:v${version}`;
  const [value, setValueRaw] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const initialRef = useRef(initial);

  // Load on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as { savedAt: number; data: Partial<T> };
      const ageMs = Date.now() - (parsed.savedAt || 0);
      if (ageMs > maxAgeHours * 60 * 60 * 1000) {
        window.localStorage.removeItem(storageKey);
      } else if (parsed.data && typeof parsed.data === "object") {
        setValueRaw((prev) => ({ ...prev, ...parsed.data }));
      }
    } catch {
      // corrupt JSON, just ignore
    }
    setHydrated(true);
    // We only want to run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = useCallback(
    (update: Partial<T> | ((prev: T) => T)) => {
      setValueRaw((prev) => {
        const next =
          typeof update === "function"
            ? (update as (p: T) => T)(prev)
            : ({ ...prev, ...update } as T);
        if (typeof window !== "undefined") {
          try {
            const scrubbed = scrub(next, sensitiveFields);
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({ savedAt: Date.now(), data: scrubbed }),
            );
          } catch {
            // quota / serialisation error, ignore
          }
        }
        return next;
      });
    },
    [storageKey, sensitiveFields],
  );

  const reset = useCallback(() => {
    setValueRaw(initialRef.current);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  return { value, setValue, reset, hydrated };
}

"use client";

import { useCallback, useRef, useState } from "react";

export type SmartFilterStatus = "idle" | "loading" | "success" | "error" | "empty";

export interface UseSmartFilterResult {
  /** Parse `query` into URL params and apply them via `setParams`. Resolves
   *  to `true` when at least one filter was applied, else `false`. */
  run: (query: string) => Promise<boolean>;
  status: SmartFilterStatus;
  message: string;
  isLoading: boolean;
}

/**
 * Shared natural-language → URL-params filtering engine.
 *
 * Extracted from `<SmartFilterBar>` (which now consumes it) so the same
 * `/api/smart-filter` call + status handling can also power an inline "press
 * Enter to filter" affordance on a directory's main search box — letting a
 * surface fold the standalone AI bar into the search input without
 * duplicating the fetch/cooldown/parse logic.
 */
export function useSmartFilter(
  surface: "advisors" | "invest",
  setParams: (updates: Record<string, string>) => void,
): UseSmartFilterResult {
  const [status, setStatus] = useState<SmartFilterStatus>("idle");
  const [message, setMessage] = useState("");
  const cooldownRef = useRef(false);

  const run = useCallback(
    async (query: string): Promise<boolean> => {
      const q = query.trim();
      if (!q || cooldownRef.current) return false;

      setStatus("loading");
      setMessage("");
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 1000);

      try {
        const res = await fetch("/api/smart-filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, surface }),
        });

        if (res.status === 429) {
          setStatus("error");
          setMessage("Too many requests — wait a moment and try again.");
          return false;
        }
        if (!res.ok) {
          setStatus("error");
          setMessage("Couldn't parse that — try a shorter phrase.");
          return false;
        }

        const data = (await res.json()) as { params?: Record<string, string> };
        if (!data.params || Object.keys(data.params).length === 0) {
          setStatus("empty");
          setMessage("No filters found — try being more specific.");
          return false;
        }

        setParams(data.params);
        setStatus("success");
        const n = Object.keys(data.params).length;
        setMessage(`Applied ${n} filter${n !== 1 ? "s" : ""}`);
        setTimeout(() => setStatus("idle"), 2000);
        return true;
      } catch {
        setStatus("error");
        setMessage("Couldn't parse that — try a shorter phrase.");
        return false;
      }
    },
    [surface, setParams],
  );

  return { run, status, message, isLoading: status === "loading" };
}

"use client";

/**
 * <DirectoryGrid> — client-side filterable professional directory grid.
 *
 * Accepts a flat list of `DirectoryItem[]` and an optional set of filter
 * configs. Sponsored items are pinned to the top row and excluded from
 * filtering. Non-sponsored items are filtered client-side by state and/or
 * fee band when filter configs are provided.
 *
 * Architecture: server component fetches items + calls boostFeaturedPartner
 * (or similar) to mark sponsored rows; this component handles the UI state.
 *
 * W-08 — hub foundation stream (REMEDIATION_QUEUE.md).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import DirectoryCard, { type DirectoryItem } from "@/components/DirectoryCard";
import DirectoryFilter, { type FilterConfig, type FeeBand } from "@/components/DirectoryFilter";

export type { DirectoryItem, FilterConfig, FeeBand };

interface DirectoryGridProps {
  items: DirectoryItem[];
  filters?: FilterConfig[];
  /** Pluralisable noun for the count badge, e.g. "auditor" → "3 auditors". */
  noun?: string;
  /** Rendered when no items pass the active filters. */
  emptyState?: React.ReactNode;
  className?: string;
}

const DEFAULT_STATE = "All states";

export default function DirectoryGrid({
  items,
  filters = [],
  noun = "result",
  emptyState,
  className,
}: DirectoryGridProps) {
  const [stateFilter, setStateFilter] = useState(DEFAULT_STATE);
  const [feeBandIndex, setFeeBandIndex] = useState(0);

  const feeBandConfig = useMemo(
    () => filters.find((f): f is Extract<FilterConfig, { type: "fee-band" }> => f.type === "fee-band"),
    [filters],
  );

  const { sponsored, regular } = useMemo(() => {
    const sp: DirectoryItem[] = [];
    const reg: DirectoryItem[] = [];
    for (const item of items) {
      (item.isSponsored ? sp : reg).push(item);
    }
    return { sponsored: sp, regular: reg };
  }, [items]);

  const filtered = useMemo(() => {
    const band: FeeBand | undefined = feeBandConfig?.bands[feeBandIndex];
    return regular.filter((item) => {
      if (filters.some((f) => f.type === "state") && stateFilter !== DEFAULT_STATE) {
        if (item.locationState !== stateFilter) return false;
      }
      if (band && (band.minCents > 0 || band.maxCents < Number.MAX_SAFE_INTEGER)) {
        const cents = item.feeCents ?? null;
        if (cents == null) return false;
        if (cents < band.minCents || cents > band.maxCents) return false;
      }
      return true;
    });
  }, [regular, stateFilter, feeBandIndex, feeBandConfig, filters]);

  const hasFilters = filters.length > 0;
  const total = sponsored.length + filtered.length;

  return (
    <div className={className} data-testid="directory-grid">
      {hasFilters && (
        <DirectoryFilter
          filters={filters}
          stateValue={stateFilter}
          feeBandIndex={feeBandIndex}
          onStateChange={setStateFilter}
          onFeeBandChange={setFeeBandIndex}
          filteredCount={total}
          noun={noun}
        />
      )}

      <section className="py-10" data-testid="directory-grid-results">
        <div className="container-custom">
          {total === 0 ? (
            <div className="py-20 text-center" data-testid="directory-grid-empty">
              {emptyState ?? (
                <p className="text-sm text-slate-500">
                  No results match these filters. Try widening your selection.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="directory-grid-list">
              {sponsored.map((item) => (
                <DirectoryCard key={`sponsored-${item.id}`} item={item} />
              ))}
              {filtered.map((item) => (
                <DirectoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Default fee-band config matching the smsf/auditors pattern. */
export const DEFAULT_FEE_BANDS: FeeBand[] = [
  { label: "Any fee", minCents: 0, maxCents: Number.MAX_SAFE_INTEGER },
  { label: "Under $500", minCents: 0, maxCents: 49999 },
  { label: "$500 – $1,000", minCents: 50000, maxCents: 100000 },
  { label: "$1,000 – $2,000", minCents: 100000, maxCents: 200000 },
  { label: "$2,000+", minCents: 200000, maxCents: Number.MAX_SAFE_INTEGER },
];

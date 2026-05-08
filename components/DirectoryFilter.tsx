"use client";

/**
 * <DirectoryFilter> — configurable filter bar for directory listings.
 *
 * Renders one <select> per filter dimension plus a result-count badge.
 * Purely presentational: state lives in <DirectoryGrid> and is threaded
 * down via value/onChange props.
 *
 * W-08 — hub foundation stream (REMEDIATION_QUEUE.md).
 */

const AU_STATES = ["All states", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export interface FeeBand {
  label: string;
  minCents: number;
  /** Use Number.MAX_SAFE_INTEGER for "no upper bound". */
  maxCents: number;
}

/** Describes one filter dimension rendered in the bar. */
export type FilterConfig =
  | {
      type: "state";
      /** Defaults to "Location". */
      label?: string;
    }
  | {
      type: "fee-band";
      /** Defaults to "Fee range". */
      label?: string;
      bands: FeeBand[];
    };

interface DirectoryFilterProps {
  filters: FilterConfig[];
  stateValue: string;
  feeBandIndex: number;
  onStateChange: (v: string) => void;
  onFeeBandChange: (i: number) => void;
  filteredCount: number;
  noun?: string;
}

export default function DirectoryFilter({
  filters,
  stateValue,
  feeBandIndex,
  onStateChange,
  onFeeBandChange,
  filteredCount,
  noun = "result",
}: DirectoryFilterProps) {
  return (
    <section
      className="bg-slate-50 border-b border-slate-200 py-5"
      data-testid="directory-filter"
    >
      <div className="container-custom">
        <div className="flex flex-wrap items-end gap-3 md:gap-4">
          {filters.map((f) => {
            if (f.type === "state") {
              return (
                <div key="state">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    {f.label ?? "Location"}
                  </label>
                  <select
                    value={stateValue}
                    onChange={(e) => onStateChange(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="directory-filter-state"
                  >
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (f.type === "fee-band") {
              return (
                <div key="fee-band">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    {f.label ?? "Fee range"}
                  </label>
                  <select
                    value={feeBandIndex}
                    onChange={(e) => onFeeBandChange(parseInt(e.target.value, 10))}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="directory-filter-fee"
                  >
                    {f.bands.map((b, i) => (
                      <option key={b.label} value={i}>{b.label}</option>
                    ))}
                  </select>
                </div>
              );
            }

            return null;
          })}

          <div className="flex-1 text-right text-xs text-slate-500" data-testid="directory-filter-count">
            {filteredCount} {filteredCount === 1 ? noun : `${noun}s`}
          </div>
        </div>
      </div>
    </section>
  );
}

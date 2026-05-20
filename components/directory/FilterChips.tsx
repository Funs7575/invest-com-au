"use client";

/**
 * Canonical active-filter chip strip for directory pages.
 *
 * Renders a "Filtering: <chips>" row with one removable chip per
 * active filter and a "Clear all" affordance at the end. Useful as
 * a persistent affordance in toolbars where the filter panel is
 * not always visible — users see what's narrowing the result set
 * and can dismiss individual filters with one click.
 *
 * Each chip is `{ label, onClear }`:
 *   - `label` is rendered as visible text + sr-only "Remove {label}
 *     filter" so screen readers get the action context
 *   - `onClear` fires on click; the consumer is responsible for
 *     mutating the underlying filter state
 *
 * Renders nothing when `chips.length === 0` so consumers can mount
 * unconditionally.
 *
 * Accessibility
 * -------------
 *  - role="region" + aria-label="Active filters" so SR users can
 *    navigate to the chip strip as a landmark
 *  - Each chip is a <button> with both visible × glyph
 *    (aria-hidden) and sr-only "Remove {label} filter" — clearest
 *    screen-reader announcement we can give without redesigning
 *    the visual chip
 */
export interface FilterChip {
  /** Visible label, e.g. "Mining", "NSW", "FIRB-eligible". */
  label: string;
  /** Fires when the user clicks the × button. */
  onClear: () => void;
}

export interface FilterChipsProps {
  chips: ReadonlyArray<FilterChip>;
  /** Fires when the user clicks "Clear all". Optional — hidden if not supplied. */
  onClearAll?: () => void;
  /** Heading rendered before the chips (default "Filtering:"). */
  prefix?: string;
  className?: string;
}

export default function FilterChips({
  chips,
  onClearAll,
  prefix = "Filtering:",
  className = "",
}: FilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Active filters"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {prefix}
      </span>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.onClear}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          {c.label}
          <span className="text-amber-600" aria-hidden="true">
            ×
          </span>
          <span className="sr-only">Remove {c.label} filter</span>
        </button>
      ))}
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline underline-offset-2 ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

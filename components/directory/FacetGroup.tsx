"use client";

/**
 * Multi-select facet group — Airbnb / Booking.com style.
 *
 * Renders a labelled group of checkbox options with live per-option
 * counts. When `counts` is supplied, options with count===0 are
 * disabled by default; pass `hideZeroCounts` to remove them entirely.
 *
 * For single-select facets (e.g. state), use a native <select>
 * directly — that pattern is keyboard-friendlier than a stack of
 * radio buttons inside a custom group.
 *
 * Compact (default) renders one option per row; pass
 * `layout="grid"` to lay them out as a responsive 2-column grid for
 * facets with > 6 options (less scroll).
 */
export interface FacetOption<T extends string = string> {
  value: T;
  label: string;
}

export interface FacetGroupProps<T extends string = string> {
  label: string;
  options: ReadonlyArray<FacetOption<T>>;
  /** Currently-selected values (multi-select). */
  selected: ReadonlySet<T>;
  /** Fires with the new selection set after a toggle. */
  onChange: (next: Set<T>) => void;
  /** Optional per-option count (Airbnb-style "12" / "0"). */
  counts?: Readonly<Record<string, number>>;
  hideZeroCounts?: boolean;
  layout?: "rows" | "grid";
  className?: string;
}

export default function FacetGroup<T extends string = string>({
  label,
  options,
  selected,
  onChange,
  counts,
  hideZeroCounts = false,
  layout = "rows",
  className = "",
}: FacetGroupProps<T>) {
  const visible = counts && hideZeroCounts
    ? options.filter((o) => (counts[o.value] ?? 0) > 0 || selected.has(o.value))
    : options;

  if (visible.length === 0) return null;

  const toggle = (value: T) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <fieldset className={`space-y-2 ${className}`}>
      <legend className="text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
      </legend>
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-2 gap-x-3 gap-y-1.5"
            : "space-y-1.5"
        }
      >
        {visible.map((o) => {
          const isSelected = selected.has(o.value);
          const count = counts?.[o.value];
          const isDisabled =
            counts !== undefined &&
            count === 0 &&
            !isSelected;
          return (
            <label
              key={o.value}
              className={`flex items-center gap-2 text-sm cursor-pointer ${
                isDisabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(o.value)}
                className="accent-amber-500 w-4 h-4 shrink-0"
              />
              <span className="flex-1 truncate">{o.label}</span>
              {typeof count === "number" && (
                <span
                  className={`text-[0.65rem] tabular-nums ${isDisabled ? "text-slate-300" : "text-slate-500"}`}
                >
                  {count}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

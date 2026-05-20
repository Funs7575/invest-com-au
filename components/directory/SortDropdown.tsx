"use client";

/**
 * Canonical sort-dropdown primitive for directory pages.
 *
 * Native <select> for full keyboard, mobile, screen-reader and form
 * compatibility — directories don't need custom popovers for sort.
 * Each option needs `{ value, label }`. Pass `defaultValue` to mark
 * the no-op state (e.g. "newest") so its option is rendered without
 * a leading separator if you want to hide it from URL params.
 *
 * Hidden on viewports narrower than `md` by default — mobile users
 * choose sort via the filter drawer, where the same options can live
 * with bigger touch targets. Override with `className` if a particular
 * page wants the dropdown visible on mobile.
 */
export interface SortOption {
  value: string;
  label: string;
}

export interface SortDropdownProps {
  options: ReadonlyArray<SortOption>;
  value: string;
  onChange: (value: string) => void;
  /** ARIA label. Defaults to "Sort results". */
  ariaLabel?: string;
  className?: string;
}

const FOCUS_RING =
  "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400";

export default function SortDropdown({
  options,
  value,
  onChange,
  ariaLabel = "Sort results",
  className = "",
}: SortDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`shrink-0 hidden md:block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${FOCUS_RING} ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

"use client";

/**
 * Single-handle range slider with optional quick-bucket presets.
 *
 * Used for "max MER", "min yield", "max fee", "min rating" etc. across
 * directory pages. Wraps a native <input type="range"> for keyboard /
 * mobile / screen-reader compatibility.
 *
 * For two-handle bounded ranges (e.g. "$100k–$1M ticket size"),
 * compose two <RangeSlider> instances side-by-side rather than
 * inventing a custom dual-handle widget — accessibility complexity
 * isn't worth the visual gain.
 *
 * Presets
 * -------
 * Pass `presets={[...]}` to render quick-jump buttons below the slider.
 * Each preset is `{ label, value }` — clicking it snaps the value and
 * announces the change to screen readers (the live region inside the
 * label catches the new formatted value).
 *
 * Formatting
 * ----------
 * The label shows `formatValue(value)` so you control display
 * (currency, percentage, count, etc.). Default: stringify.
 */
export interface RangePreset {
  label: string;
  value: number;
}

export interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  /** Formatter for the current value in the legend (e.g. "$1.2M", "5.4%"). */
  formatValue?: (v: number) => string;
  presets?: ReadonlyArray<RangePreset>;
  /** Suffix text shown after the slider, e.g. "% max" or "km radius". */
  suffix?: string;
  className?: string;
}

export default function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => String(v),
  presets,
  suffix,
  className = "",
}: RangeSliderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
        <span>{label}</span>
        <span className="text-sm font-black text-amber-700 normal-case tracking-normal" aria-live="polite">
          {formatValue(value)}
          {suffix && <span className="text-slate-500 font-medium ml-1">{suffix}</span>}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={formatValue(value)}
        className="w-full accent-amber-500"
      />
      <div className="flex justify-between text-[0.65rem] text-slate-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value)}
              aria-pressed={value === p.value}
              className={`px-2.5 py-1 text-[0.7rem] font-semibold rounded-full transition-all ${
                value === p.value
                  ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

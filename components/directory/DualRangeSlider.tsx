"use client";

import { useId } from "react";

export interface DualRangePreset {
  label: string;
  low: number;
  high: number;
}

export interface DualRangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  valueLow: number;
  valueHigh: number;
  onChangeLow: (v: number) => void;
  onChangeHigh: (v: number) => void;
  formatValue?: (v: number) => string;
  presets?: ReadonlyArray<DualRangePreset>;
  suffix?: string;
  className?: string;
}

export default function DualRangeSlider({
  label,
  min,
  max,
  step = 1,
  valueLow,
  valueHigh,
  onChangeLow,
  onChangeHigh,
  formatValue = (v) => String(v),
  presets,
  suffix,
  className = "",
}: DualRangeSliderProps) {
  const lowId = useId();
  const highId = useId();

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const lowPct = pct(valueLow);
  const highPct = pct(valueHigh);

  const handleLow = (next: number) => {
    onChangeLow(Math.min(next, valueHigh - step));
  };
  const handleHigh = (next: number) => {
    onChangeHigh(Math.max(next, valueLow + step));
  };

  const isPresetActive = (p: DualRangePreset) =>
    valueLow === p.low && valueHigh === p.high;

  const displayValue =
    valueLow === min && valueHigh === max
      ? "Any"
      : valueLow === min
        ? `≤ ${formatValue(valueHigh)}${suffix ? ` ${suffix}` : ""}`
        : valueHigh === max
          ? `≥ ${formatValue(valueLow)}${suffix ? ` ${suffix}` : ""}`
          : `${formatValue(valueLow)}–${formatValue(valueHigh)}${suffix ? ` ${suffix}` : ""}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          {label}
        </span>
        <span
          className="text-sm font-black text-amber-700 normal-case tracking-normal"
          aria-live="polite"
        >
          {displayValue}
        </span>
      </div>

      {/* Track with filled range between the two thumbs */}
      <div className="relative h-10 flex items-center">
        <div className="relative w-full h-1.5 bg-slate-200 rounded-full">
          <div
            className="absolute h-full bg-amber-400 rounded-full"
            style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
          />
        </div>

        {/* Low thumb */}
        <input
          id={lowId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueLow}
          onChange={(e) => handleLow(Number(e.target.value))}
          aria-label={`${label} minimum`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueLow}
          aria-valuetext={formatValue(valueLow)}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:border-none"
        />

        {/* High thumb */}
        <input
          id={highId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueHigh}
          onChange={(e) => handleHigh(Number(e.target.value))}
          aria-label={`${label} maximum`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueHigh}
          aria-valuetext={formatValue(valueHigh)}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:border-none"
        />
      </div>

      <div className="flex justify-between text-[0.65rem] text-slate-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onChangeLow(p.low);
                onChangeHigh(p.high);
              }}
              aria-pressed={isPresetActive(p)}
              className={`px-2.5 py-1 text-[0.7rem] font-semibold rounded-full transition-all ${
                isPresetActive(p)
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

"use client";

import { useRef, useEffect, useState } from "react";

export interface SubCategoryOption {
  value: string;
  label: string;
  count?: number;
}

export interface SubCategoryChipsProps {
  options: ReadonlyArray<SubCategoryOption>;
  value: string;
  onChange: (next: string) => void;
  label?: string;
  className?: string;
}

export default function SubCategoryChips({
  options,
  value,
  onChange,
  label,
  className = "",
}: SubCategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shadows, setShadows] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setShadows({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [options]);

  if (options.length === 0) return null;

  const allOption: SubCategoryOption = { value: "", label: "All" };
  const chips = [allOption, ...options];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      )}
      <div className="relative">
        {shadows.left && (
          <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-white to-transparent z-10" />
        )}
        {shadows.right && (
          <div className="absolute inset-y-0 right-0 w-8 pointer-events-none bg-gradient-to-l from-white to-transparent z-10" />
        )}
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5"
          role="group"
          aria-label={label ?? "Sub-category filter"}
        >
          {chips.map((chip) => {
            const isActive = chip.value === value;
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(chip.value)}
                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                  isActive
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {chip.label}
                {typeof chip.count === "number" && chip.value !== "" && (
                  <span
                    className={`text-[0.6rem] tabular-nums ${isActive ? "text-amber-100" : "text-slate-400"}`}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

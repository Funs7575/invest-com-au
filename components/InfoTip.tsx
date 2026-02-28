"use client";

import { useState, useRef, useEffect } from "react";

interface InfoTipProps {
  text: string;
  className?: string;
}

/**
 * Small ⓘ icon that shows a tooltip on hover/click.
 * Used next to form labels and complex fields to explain what they do.
 */
export default function InfoTip({ text, className = "" }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 text-[0.55rem] font-bold leading-none transition-colors cursor-help ml-1 shrink-0"
        aria-label="More info"
      >
        i
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-56 px-3 py-2 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-lg pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { GLOSSARY } from "@/lib/glossary";

/**
 * Wraps a financial term with a dotted underline and shows a plain-English
 * tooltip on hover (desktop) or tap (mobile).
 *
 * Usage:
 *   <JargonTooltip term="ASX Fee" />
 *   <JargonTooltip term="CHESS">CHESS Sponsored</JargonTooltip>
 */
export default function JargonTooltip({
  term,
  children,
  className = "",
}: {
  term: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const definition = GLOSSARY[term];

  // Close tooltip when clicking outside (mobile)
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!definition) {
    return <span className={className}>{children || term}</span>;
  }

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center gap-0.5 cursor-help ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <span className="border-b border-dotted border-slate-400">
        {children || term}
      </span>
      <svg
        className="w-3 h-3 text-slate-400 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
      </svg>
      {open && (
        <span
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-lg pointer-events-none"
          role="tooltip"
        >
          {definition}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

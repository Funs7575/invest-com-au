"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";

/**
 * Shared pill + popover primitives for directory filter bars.
 *
 * Extracted verbatim from /invest's MarketplaceFilterBar so /advisors can
 * present the SAME horizontal pill-popover filter row and the two
 * directories share one filter-bar language.
 *
 *   - <FilterPill>     — rounded trigger button: icon · label · optional
 *                        active value · chevron. Amber surface when active.
 *   - <FilterPopover>  — the panel a pill opens. role=dialog, anchored under
 *                        the trigger, closes on Escape / outside-click.
 *
 * Consumers own the open/selection state (one `openId` per bar) and render
 * the popover body — these primitives only standardise the trigger + shell.
 */
export function FilterPill({
  icon,
  label,
  value,
  active,
  open,
  onClick,
}: {
  icon: string;
  label: string;
  value?: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
        active
          ? "border-amber-400 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <Icon name={icon} size={13} />
      <span>{label}</span>
      {value && <span className="font-bold text-slate-900">· {value}</span>}
      <Icon name="chevron-down" size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

export function FilterPopover({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      // Close-boundary is the `.relative` wrapper (panel's parent) — which also
      // holds the trigger pill — NOT just the panel. If we tested the panel
      // alone, a mousedown on the trigger would count as "outside" and close
      // the popover before the trigger's own click re-opened it, so an open
      // pill could never be toggled shut. Consumers must render <FilterPill>
      // and <FilterPopover> as siblings inside one positioned wrapper.
      const boundary = ref.current?.parentElement ?? ref.current;
      if (boundary && !boundary.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="absolute top-full left-0 mt-1.5 z-40 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg p-4 dark:bg-slate-800 dark:border-slate-700"
    >
      {children}
    </div>
  );
}

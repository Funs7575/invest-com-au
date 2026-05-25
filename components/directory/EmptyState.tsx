"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Canonical empty-state for directory pages and account surfaces.
 *
 * Renders a centered message + optional smart-suggestion list when
 * filtering returns zero results. The suggestions are the difference
 * between a frustrating dead-end and a productive recovery — they
 * give users a concrete next click instead of just "no results, try
 * something else".
 *
 * Slots:
 *   1. `icon` (optional) — defaults to the search icon
 *   2. `title` — short headline ("No advisors found", "No
 *      opportunities match your filters")
 *   3. `body` — one-sentence explanation ("Try removing some filters
 *      or expanding the radius.")
 *   4. `suggestions` (optional) — array of one-click recovery
 *      actions (button/onClick, used by directory filter resets).
 *   5. `ctas` (optional) — array of link-based CTAs ({label, href,
 *      variant}) for account surfaces where navigation is the
 *      next step rather than filter mutation.
 *   6. `children` (optional) — slot for a custom action, e.g. an
 *      alert-capture email form. Renders below suggestions/CTAs.
 *
 * Use inline (inside the result feed where listings would be) rather
 * than as a modal — empty-state modals interrupt flow and aren't
 * needed for filter-induced empties.
 */
export interface EmptyStateSuggestion {
  label: string;
  onClick: () => void;
}

/** A link-based CTA for surfaces where the next step is navigation. */
export interface EmptyStateCta {
  label: string;
  href: string;
  /** "primary" = dark filled button; "secondary" = outlined. Default: "primary". */
  variant?: "primary" | "secondary";
}

export interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: string;
  suggestions?: ReadonlyArray<EmptyStateSuggestion>;
  /** Link-based CTAs (account surfaces). Renders in place of / after suggestions. */
  ctas?: ReadonlyArray<EmptyStateCta>;
  /** Optional custom slot (e.g. alert-capture form). Renders below suggestions/CTAs. */
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  body,
  icon = "search",
  suggestions,
  ctas,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label="No results"
      className={`bg-white border border-slate-200 rounded-2xl text-center py-10 px-5 ${className}`}
    >
      <Icon
        name={icon}
        size={32}
        className="text-slate-300 mx-auto mb-3"
        aria-hidden
      />
      <p className="text-sm font-bold text-slate-700 mb-1">{title}</p>
      {body && (
        <p className="text-xs text-slate-500 mb-3 max-w-md mx-auto leading-relaxed">
          {body}
        </p>
      )}
      {suggestions && suggestions.length > 0 && (
        <ul className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={s.onClick}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 rounded-full hover:bg-amber-100 transition-colors"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {ctas && ctas.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {ctas.map((cta, i) => (
            <Link
              key={i}
              href={cta.href}
              className={
                (cta.variant ?? "primary") === "primary"
                  ? "inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                  : "inline-block px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              }
            >
              {cta.label}
            </Link>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

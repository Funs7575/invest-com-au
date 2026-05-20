"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";

/**
 * Canonical empty-state for directory pages.
 *
 * Renders a centered message + optional smart-suggestion list when
 * filtering returns zero results. The suggestions are the difference
 * between a frustrating dead-end and a productive recovery — they
 * give users a concrete next click instead of just "no results, try
 * something else".
 *
 * Three slots:
 *   1. `icon` (optional) — defaults to the search icon
 *   2. `title` — short headline ("No advisors found", "No
 *      opportunities match your filters")
 *   3. `body` — one-sentence explanation ("Try removing some filters
 *      or expanding the radius.")
 *   4. `suggestions` (optional) — array of one-click recovery
 *      actions ("Remove the SIV filter (+12 results)", "Expand to
 *      'Any distance' (+48 results)"). Each suggestion has a label
 *      and an onClick; the count delta is part of the label
 *      because rendering it separately required a tighter layout
 *      contract we don't need yet.
 *   5. `children` (optional) — slot for a custom action, e.g. an
 *      alert-capture email form. Renders below suggestions.
 *
 * Use inline (inside the result feed where listings would be) rather
 * than as a modal — empty-state modals interrupt flow and aren't
 * needed for filter-induced empties.
 */
export interface EmptyStateSuggestion {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: string;
  suggestions?: ReadonlyArray<EmptyStateSuggestion>;
  /** Optional custom slot (e.g. alert-capture form). Renders below suggestions. */
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  body,
  icon = "search",
  suggestions,
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
      {children}
    </div>
  );
}

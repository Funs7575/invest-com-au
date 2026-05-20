"use client";

import { useEffect, useId, type ReactNode } from "react";

/**
 * Canonical filter-panel container for directory pages.
 *
 * Renders as a slide-over drawer on mobile and an inline collapsible
 * panel on desktop (the "responsive" default — best of both worlds
 * per the directory-UX unification plan Q2 decision). Pages compose
 * their own filter sections inside; this primitive owns the
 * open/close mechanics, ARIA modal semantics, Escape-to-close,
 * backdrop click, and the "Clear all" + "Show N results" footer.
 *
 * Variants
 * --------
 *  - "responsive" (default) — drawer on mobile, inline on desktop.
 *  - "drawer"               — slide-over on all breakpoints.
 *  - "inline"               — collapsible panel on all breakpoints
 *                             (e.g. for full-page filter views).
 *
 * Accessibility
 * -------------
 *  - role="dialog" + aria-modal="true" on the drawer surface
 *  - aria-labelledby pointing to the heading
 *  - Escape closes the drawer (drawer mode only — inline mode has
 *    no concept of closed-vs-hidden)
 *  - Focus trapping intentionally NOT implemented here — too
 *    invasive to ship without a wider audit. Browser-native focus
 *    order suffices for now; the next a11y polish session can layer
 *    react-focus-lock if needed.
 *
 * Note: when `variant="responsive"`, the desktop view is rendered
 * inline (no overlay) and the `open` prop is ignored — the panel
 * is always present. The drawer overlay only appears on mobile.
 */
export interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onClearAll?: () => void;
  /** Total active filter count — drives the "Clear all (N)" affordance. */
  activeCount?: number;
  /** Total result count — drives the "Show N results" footer button. */
  resultCount?: number;
  /** Heading label inside the drawer; defaults to "Filters". */
  heading?: string;
  variant?: "responsive" | "drawer" | "inline";
  children: ReactNode;
}

export default function FilterPanel({
  open,
  onClose,
  onClearAll,
  activeCount = 0,
  resultCount,
  heading = "Filters",
  variant = "responsive",
  children,
}: FilterPanelProps) {
  // Escape-to-close + lock background scroll while the drawer is on-screen.
  // In "responsive" mode the drawer is mobile-only (md:hidden), so the lock
  // tracks the md breakpoint — otherwise crossing to desktop while open
  // (e.g. rotating a tablet) would strand the page scroll-locked with no
  // visible drawer to dismiss. "drawer" mode shows at all widths → always
  // lock while open. Restoring the prior overflow avoids clobbering an
  // outer modal's lock.
  useEffect(() => {
    if (variant === "inline" || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const mql =
      variant === "responsive"
        ? window.matchMedia("(max-width: 767.98px)")
        : null;
    const prevOverflow = document.body.style.overflow;
    const syncLock = () => {
      const drawerVisible = mql ? mql.matches : true;
      document.body.style.overflow = drawerVisible ? "hidden" : prevOverflow;
    };
    syncLock();
    mql?.addEventListener("change", syncLock);

    return () => {
      document.removeEventListener("keydown", onKey);
      mql?.removeEventListener("change", syncLock);
      document.body.style.overflow = prevOverflow;
    };
  }, [variant, open, onClose]);

  // Inline-only: just render the panel body if open.
  if (variant === "inline") {
    if (!open) return null;
    return (
      <FilterPanelInline
        heading={heading}
        activeCount={activeCount}
        resultCount={resultCount}
        onClose={onClose}
        onClearAll={onClearAll}
      >
        {children}
      </FilterPanelInline>
    );
  }

  // Responsive: drawer on mobile, inline always-visible on desktop.
  if (variant === "responsive") {
    return (
      <>
        {/* Desktop: always-visible inline panel */}
        <div className="hidden md:block">
          <FilterPanelInline
            heading={heading}
            activeCount={activeCount}
            resultCount={resultCount}
            onClose={onClose}
            onClearAll={onClearAll}
          >
            {children}
          </FilterPanelInline>
        </div>
        {/* Mobile: slide-over drawer when open */}
        {open && (
          <div className="md:hidden">
            <FilterPanelDrawer
              heading={heading}
              activeCount={activeCount}
              resultCount={resultCount}
              onClose={onClose}
              onClearAll={onClearAll}
            >
              {children}
            </FilterPanelDrawer>
          </div>
        )}
      </>
    );
  }

  // Drawer everywhere
  if (!open) return null;
  return (
    <FilterPanelDrawer
      heading={heading}
      activeCount={activeCount}
      resultCount={resultCount}
      onClose={onClose}
      onClearAll={onClearAll}
    >
      {children}
    </FilterPanelDrawer>
  );
}

interface InternalProps {
  heading: string;
  activeCount: number;
  resultCount?: number;
  onClose: () => void;
  onClearAll?: () => void;
  children: ReactNode;
}

function FilterPanelInline({
  heading,
  activeCount,
  resultCount,
  onClearAll,
  children,
}: InternalProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-4 md:mb-6 space-y-4"
    >
      <header className="flex items-center justify-between">
        <h2 id={headingId} className="text-sm font-extrabold text-slate-800">
          {heading}
          {activeCount > 0 && (
            <span className="ml-2 text-xs font-semibold text-amber-700">
              ({activeCount} active)
            </span>
          )}
        </h2>
        {onClearAll && activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        )}
      </header>
      <div className="space-y-4">{children}</div>
      {typeof resultCount === "number" && (
        <p className="text-xs text-slate-500" aria-live="polite">
          {resultCount} {resultCount === 1 ? "result" : "results"} match
        </p>
      )}
    </section>
  );
}

function FilterPanelDrawer({
  heading,
  activeCount,
  resultCount,
  onClose,
  onClearAll,
  children,
}: InternalProps) {
  const headingId = useId();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close filter drawer"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      {/* Sheet — mobile bottom-sheet style for best touch ergonomics */}
      <div className="relative mt-auto bg-white rounded-t-3xl border-t border-slate-200 max-h-[85vh] flex flex-col shadow-2xl">
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 id={headingId} className="text-base font-extrabold text-slate-900">
            {heading}
            {activeCount > 0 && (
              <span className="ml-2 text-xs font-semibold text-amber-700">
                ({activeCount} active)
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {children}
        </div>
        <footer className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={activeCount === 0}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 max-w-xs ml-auto py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            {typeof resultCount === "number"
              ? `Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`
              : "Show results"}
          </button>
        </footer>
      </div>
    </div>
  );
}

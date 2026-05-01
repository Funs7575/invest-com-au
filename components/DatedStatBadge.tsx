"use client";

import {
  defaultStalesAt,
  freshnessLevel,
  isStale,
  type FreshnessLevel,
} from "@/lib/dated-stats";
import { useId, useState, type ReactNode } from "react";

interface DatedStatBadgeProps {
  /**
   * The displayed value, e.g. "$2.1B" or "30 April 2026".
   * Either `value` or `children` must be provided.
   */
  value?: string | number;
  /** Alternatively render children as the stat content. */
  children?: ReactNode;
  /**
   * ISO date string or Date — when this datapoint was checked / sourced.
   * Used to compute the default `stalesAt` (sourcedAt + 3 months) and the
   * `aging` half of the freshness window. Optional for backwards compat with
   * the original PR #253 prop shape; if omitted, the badge only renders the
   * value and the dev-only stale indicator.
   */
  sourcedAt?: Date | string;
  /**
   * ISO date string or Date after which this stat is considered stale.
   * If omitted and `sourcedAt` is provided, defaults to `sourcedAt + 3 months`.
   *
   * The CI gate (V-NEW-01) reads this prop at build time to fail the build
   * if a badge's stalesAt date is in the past.
   */
  stalesAt?: Date | string;
  /** Human-readable source citation (e.g. "ASIC, 2026-04-15"). */
  source?: string;
  /** URL the citation links to (opened in new tab when provided). */
  sourceUrl?: string;
  /**
   * Override the computed freshness level. Useful for content that wants to
   * force "aging" styling early (e.g. when a regulator has signalled an
   * imminent change but the stat itself is still technically valid).
   */
  freshness?: FreshnessLevel;
  /** Accessible label prefix for screen readers, e.g. "Total committed". */
  label?: string;
  /** Extra class names applied to the wrapper span. */
  className?: string;
}

/**
 * Wraps a dated stat (number, date string, or text claim) so the build-time
 * CI gate (V-NEW-01) can detect stale values before they ship to production.
 *
 * Renders as an inline <span> with subtle freshness-aware styling:
 *   - fresh: no decoration (default site styling)
 *   - aging: amber underline + tooltip prompt to verify
 *   - stale: muted text + warning icon + tooltip prompt to update
 *
 * When `source` or `sourceUrl` are provided, a small "i" affordance appears
 * after the value and toggles a popover with the source citation + sourcedAt
 * + stalesAt dates. The popover is keyboard-reachable (`<button>` + Enter)
 * and click-anywhere-else dismissible.
 *
 * In development mode, adds a yellow ⚠ indicator when stalesAt is past today
 * so developers can notice stale values while working locally even when no
 * `source` prop is set.
 */
export default function DatedStatBadge({
  value,
  children,
  sourcedAt,
  stalesAt,
  source,
  sourceUrl,
  freshness,
  label,
  className,
}: DatedStatBadgeProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  // Resolve stalesAt: explicit prop > derived from sourcedAt > undefined.
  const resolvedStalesAt: Date | string | undefined =
    stalesAt ?? (sourcedAt ? defaultStalesAt(sourcedAt) : undefined);

  const stalesAtDate = resolvedStalesAt
    ? resolvedStalesAt instanceof Date
      ? resolvedStalesAt
      : new Date(resolvedStalesAt)
    : null;

  const staleNow =
    stalesAtDate != null && isStale(stalesAtDate, new Date());

  // Compute freshness level when both endpoints are known; otherwise rely on
  // the explicit `freshness` prop or fall back to a binary fresh/stale based
  // on stalesAtDate.
  let level: FreshnessLevel;
  if (freshness) {
    level = freshness;
  } else if (sourcedAt && resolvedStalesAt) {
    level = freshnessLevel(sourcedAt, resolvedStalesAt, new Date());
  } else if (staleNow) {
    level = "stale";
  } else {
    level = "fresh";
  }

  const isDev = process.env.NODE_ENV !== "production";

  const wrapperClasses = [
    "inline-flex items-baseline gap-1",
    level === "aging"
      ? "text-amber-700 underline decoration-amber-400 decoration-dotted underline-offset-2"
      : "",
    level === "stale" ? "text-slate-400 line-through decoration-slate-300" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const hasPopover = Boolean(source || sourceUrl || sourcedAt);

  return (
    <span
      className={wrapperClasses}
      data-stales-at={stalesAtDate ? stalesAtDate.toISOString() : undefined}
      data-freshness={level}
      {...(staleNow ? { "data-stale": "true" } : {})}
    >
      {label && <span className="sr-only">{label}: </span>}
      <span>{children ?? value}</span>

      {level === "stale" && (
        <span
          aria-label="Stat is past its review-by date"
          title={
            stalesAtDate
              ? `Stat staled on ${stalesAtDate.toLocaleDateString("en-AU")}`
              : "Stat is past its review-by date"
          }
          className="text-xs font-semibold text-amber-600"
        >
          ⚠
        </span>
      )}

      {isDev && staleNow && level !== "stale" && (
        <span
          className="ml-1 text-xs font-semibold text-amber-600"
          aria-label="Stat may be outdated — update stalesAt date"
          title={
            stalesAtDate
              ? `Stat staled on ${stalesAtDate.toLocaleDateString("en-AU")}`
              : "Stat may be outdated"
          }
        >
          ⚠
        </span>
      )}

      {hasPopover && (
        <>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            onBlur={() => setOpen(false)}
            aria-expanded={open}
            aria-controls={popoverId}
            aria-label={
              source
                ? `Source: ${source}`
                : "Show data source"
            }
            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold leading-none opacity-60 hover:opacity-100 focus:opacity-100 focus:outline-none"
          >
            i
          </button>
          {open && (
            <span
              id={popoverId}
              role="tooltip"
              className="absolute z-20 mt-5 max-w-xs rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg"
            >
              {source && <span className="block font-medium">{source}</span>}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 underline"
                >
                  View source
                </a>
              )}
              {sourcedAt && (
                <span className="block text-slate-500">
                  Sourced:{" "}
                  {new Date(sourcedAt).toLocaleDateString("en-AU")}
                </span>
              )}
              {stalesAtDate && (
                <span className="block text-slate-500">
                  Review by:{" "}
                  {stalesAtDate.toLocaleDateString("en-AU")}
                </span>
              )}
            </span>
          )}
        </>
      )}
    </span>
  );
}

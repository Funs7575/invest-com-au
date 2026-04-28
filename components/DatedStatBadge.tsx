"use client";

import { isStale } from "@/lib/dated-stats";
import type { ReactNode } from "react";

interface DatedStatBadgeProps {
  /**
   * The displayed value, e.g. "$2.1B" or "30 April 2026".
   * Either `value` or `children` must be provided.
   */
  value?: string;
  /** Alternatively render children as the stat content. */
  children?: ReactNode;
  /**
   * ISO date string or Date after which this stat is considered stale.
   * Example: "2026-06-30" or new Date("2026-06-30").
   *
   * The CI gate (V-NEW-01) reads this prop at build time to fail the build
   * if a badge's stalesAt date is in the past.
   */
  stalesAt: Date | string;
  /** Accessible label prefix for screen readers, e.g. "Total committed". */
  label?: string;
  /** Extra class names applied to the wrapper span. */
  className?: string;
}

/**
 * Wraps a dated stat (number, date string, or text claim) so the build-time
 * CI gate (V-NEW-01) can detect stale values before they ship to production.
 *
 * Renders as an inline <span> with no visual change by default.
 * In development mode, adds a yellow ⚠ indicator when stalesAt is past today
 * so developers can notice stale values while working locally.
 */
export default function DatedStatBadge({
  value,
  children,
  stalesAt,
  label,
  className,
}: DatedStatBadgeProps) {
  const stalesAtDate =
    stalesAt instanceof Date ? stalesAt : new Date(stalesAt);

  const staleNow = isStale(
    { id: "", label: "", value: value ?? "", stalesAt: stalesAtDate },
    new Date()
  );

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <span
      className={className}
      data-stales-at={stalesAtDate.toISOString()}
      {...(staleNow ? { "data-stale": "true" } : {})}
    >
      {label && <span className="sr-only">{label}: </span>}
      {children ?? value}
      {isDev && staleNow && (
        <span
          className="ml-1 text-xs font-semibold text-amber-600"
          aria-label="Stat may be outdated — update stalesAt date"
          title={`Stat staled on ${stalesAtDate.toLocaleDateString("en-AU")}`}
        >
          ⚠
        </span>
      )}
    </span>
  );
}

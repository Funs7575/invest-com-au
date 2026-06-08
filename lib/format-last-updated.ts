/**
 * Human-friendly "last updated" formatter (ADV-019).
 *
 * Produces a coarse relative phrase suitable for "Profile last updated <X>"
 * captions — e.g. "today", "3 days ago", "2 months ago", "over a year ago".
 * Intentionally low-resolution: profile freshness is a trust signal, not a
 * precise timestamp, so we avoid minute/second granularity.
 *
 * Returns `null` for missing or unparseable input so callers can omit the
 * caption entirely rather than render a broken date.
 */
export function formatLastUpdated(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return null;

  const diffMs = now.getTime() - ms;
  // Guard against clock skew / future timestamps — treat as "today".
  if (diffMs < 0) return "today";

  const day = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor(diffMs / day);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;

  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return months === 1 ? "1 month ago" : `${months} months ago`;

  const years = Math.floor(diffDays / 365);
  return years === 1 ? "over a year ago" : `${years} years ago`;
}

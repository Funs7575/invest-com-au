/**
 * "Last updated / last reviewed" trust badge.
 *
 * Renders a small date chip on article headers, broker reviews,
 * and other editorial content. Uses the more recent of
 * `updatedAt` and `lastReviewedAt` and labels it accordingly:
 *
 *   - Reviewed by a human more recently → "Reviewed <date>"
 *   - Otherwise → "Updated <date>"
 *
 * Renders the date inside a <time datetime="..."> element so
 * search engines and screen readers parse it correctly. Hidden
 * entirely if no date is supplied — never emits "Updated —".
 */

interface Props {
  updatedAt?: string | null;
  lastReviewedAt?: string | null;
  lastReviewedBy?: string | null;
  className?: string;
}

export default function LastUpdatedBadge({
  updatedAt,
  lastReviewedAt,
  lastReviewedBy,
  className = "",
}: Props) {
  const reviewedTs = lastReviewedAt ? Date.parse(lastReviewedAt) : 0;
  const updatedTs = updatedAt ? Date.parse(updatedAt) : 0;

  if (!reviewedTs && !updatedTs) return null;

  const useReviewed = reviewedTs > 0 && reviewedTs >= updatedTs;
  const iso = useReviewed ? (lastReviewedAt as string) : (updatedAt as string);
  const label = useReviewed ? "Reviewed" : "Updated";
  const date = new Date(iso);
  const formatted = date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500 ${className}`}
      aria-label={`${label} ${formatted}${
        useReviewed && lastReviewedBy ? " by " + lastReviewedBy : ""
      }`}
    >
      <svg
        aria-hidden="true"
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>
        {label}{" "}
        <time dateTime={iso}>{formatted}</time>
        {useReviewed && lastReviewedBy && (
          <span className="text-slate-400"> · {lastReviewedBy}</span>
        )}
      </span>
    </span>
  );
}

/**
 * TrustedReviewerBadge — shows "Trusted Reviewer" when the author has
 * earned an 'expert' badge through review contributions.
 *
 * Usage on review cards or reviewer profiles:
 *   <TrustedReviewerBadge badge={review.author_badge} reviewCount={5} />
 */

interface Props {
  /** Value from forum_user_profiles.badge */
  badge: string | null | undefined;
  /** Total approved review count for this author */
  reviewCount?: number;
  className?: string;
}

export default function TrustedReviewerBadge({ badge, reviewCount = 0, className }: Props) {
  const isExpert = badge === "expert";
  const isContributor = badge === "contributor";

  if (!isExpert && !(isContributor && reviewCount >= 3)) {
    return null;
  }

  if (isExpert) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full ${className ?? ""}`}
        title={`Trusted Reviewer — ${reviewCount} approved reviews`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Trusted Reviewer
      </span>
    );
  }

  // Contributor tier: simpler label
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full ${className ?? ""}`}
      title={`Verified Contributor — ${reviewCount} approved reviews`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified Contributor
    </span>
  );
}

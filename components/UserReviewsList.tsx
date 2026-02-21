"use client";

import type { UserReview, BrokerReviewStats } from "@/lib/types";
import UserReviewForm from "./UserReviewForm";

interface UserReviewsListProps {
  reviews: UserReview[];
  stats: BrokerReviewStats | null;
  brokerSlug: string;
  brokerName: string;
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? "#f59e0b" : "none"}
          stroke={star <= Math.round(rating) ? "#f59e0b" : "#cbd5e1"}
          strokeWidth={1.5}
          className={sizeClass}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </div>
  );
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-slate-500 text-right">{star}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-amber-400 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-slate-400 text-right">{count}</span>
    </div>
  );
}

export default function UserReviewsList({ reviews, stats, brokerSlug, brokerName }: UserReviewsListProps) {
  // Calculate distribution for rating bars
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section className="mb-8" id="user-reviews">
      <h2 className="text-xl font-extrabold text-slate-900 mb-4">User Reviews</h2>

      {stats && stats.review_count > 0 ? (
        <div className="bg-slate-50 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Left: Big score */}
            <div className="text-center sm:text-left shrink-0">
              <div className="text-4xl font-black text-slate-900">
                {stats.average_rating.toFixed(1)}
              </div>
              <StarDisplay rating={stats.average_rating} size="md" />
              <p className="text-xs text-slate-500 mt-1">
                {stats.review_count} user review{stats.review_count !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Right: Distribution bars */}
            <div className="flex-1 space-y-1.5">
              {distribution.map(({ star, count }) => (
                <RatingBar key={star} star={star} count={count} total={reviews.length} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-5 mb-5 text-center">
          <p className="text-sm text-slate-500">No user reviews yet. Be the first to share your experience!</p>
        </div>
      )}

      {/* Review Cards */}
      {reviews.length > 0 && (
        <div className="space-y-4 mb-5">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <StarDisplay rating={review.rating} />
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{review.title}</h4>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {new Date(review.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-3">
                {review.body}
              </p>

              {(review.pros || review.cons) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {review.pros && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-bold text-green-700 mb-1">Pros</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{review.pros}</p>
                    </div>
                  )}
                  {review.cons && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-bold text-red-700 mb-1">Cons</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{review.cons}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-400">
                — {review.display_name}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Review Form */}
      <UserReviewForm brokerSlug={brokerSlug} brokerName={brokerName} />
    </section>
  );
}

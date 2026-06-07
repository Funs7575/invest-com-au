"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";

interface Review {
  id: number;
  rating: number;
  headline: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  user_id: string;
}

interface Props {
  slug: string;
  initialReviews?: Review[];
  avgRating?: number | null;
  count?: number;
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "text-xl" : "text-sm";
  return (
    <span className={sizeClass} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-amber-400" : "text-slate-200"}>
          {n <= rating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1" role="group" aria-label="Select a star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className={`text-2xl transition-colors ${
            n <= (hovered || value) ? "text-amber-400" : "text-slate-300"
          }`}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export default function CourseReviews({
  slug,
  initialReviews,
  avgRating: initialAvg,
  count: initialCount,
}: Props) {
  const { user, loading: userLoading } = useUser();
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [avgRating, setAvgRating] = useState<number | null>(initialAvg ?? null);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [loadingReviews, setLoadingReviews] = useState(!initialReviews);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialReviews) return;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${slug}/reviews`);
        if (res.ok) {
          const json = await res.json() as { reviews: Review[]; avg_rating: number | null; count: number };
          setReviews(json.reviews);
          setAvgRating(json.avg_rating);
          setCount(json.count);
        }
      } finally {
        setLoadingReviews(false);
      }
    })();
  }, [slug, initialReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setFormError("Please select a star rating.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          headline: headline.trim() || undefined,
          body: body.trim() || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json() as { review: Review };
        const newReview = json.review;
        setReviews((prev) => [newReview, ...prev.filter((r) => r.user_id !== newReview.user_id)]);
        const updatedRatings = [newReview, ...reviews.filter((r) => r.user_id !== newReview.user_id)].map((r) => r.rating);
        setAvgRating(
          updatedRatings.length > 0
            ? Math.round((updatedRatings.reduce((a, b) => a + b, 0) / updatedRatings.length) * 10) / 10
            : null,
        );
        setCount(updatedRatings.length);
        setSubmitted(true);
        setShowForm(false);
        setRating(0);
        setHeadline("");
        setBody("");
      } else {
        const json = await res.json().catch(() => ({})) as { error?: string };
        setFormError(json.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingReviews) {
    return (
      <div className="mb-16 max-w-3xl mx-auto animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-16 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Student Reviews</h2>
          {count > 0 && avgRating !== null && (
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay rating={Math.round(avgRating)} size="lg" />
              <span className="text-lg font-bold text-slate-800">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-slate-500">({count} review{count !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
        {!userLoading && user && !showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {submitted && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-medium">
          Your review has been submitted. Thank you!
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <h3 className="font-bold text-slate-900">Write Your Review</h3>

          <div>
            <p className="block text-sm font-medium text-slate-700 mb-1">
              Your Rating <span className="text-red-500">*</span>
            </p>
            <StarSelector value={rating} onChange={setRating} />
          </div>

          <div>
            <label htmlFor="review-headline" className="block text-sm font-medium text-slate-700 mb-1">
              Headline <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="review-headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={150}
              placeholder="Summarise your experience"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label htmlFor="review-body" className="block text-sm font-medium text-slate-700 mb-1">
              Review <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Tell other students about your experience..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{body.length}/2000</p>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
              className="px-5 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 && (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-500 text-sm">No reviews yet. Be the first to share your experience!</p>
          {!userLoading && !user && (
            <p className="text-xs text-slate-400 mt-2">
              <a href={`/auth/login?next=/courses/${slug}`} className="underline hover:text-slate-700">
                Sign in
              </a>{" "}
              to write a review.
            </p>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <StarDisplay rating={review.rating} />
                  {review.headline && (
                    <p className="font-semibold text-sm text-slate-900 mt-1">{review.headline}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {review.is_verified_purchase && (
                    <span className="inline-block text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                      Verified Purchase
                    </span>
                  )}
                  <p className="text-xs text-slate-400">{relativeTime(review.created_at)}</p>
                </div>
              </div>
              {review.body && (
                <p className="text-sm text-slate-600 leading-relaxed mt-2">{review.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

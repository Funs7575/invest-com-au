"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";

type ReviewStatus = "approved" | "pending";

type ReviewRow = {
  id: number;
  reviewer_name: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  created_at: string;
  communication_rating?: number | null;
  expertise_rating?: number | null;
  value_for_money_rating?: number | null;
  status: ReviewStatus;
};

type ReviewStats = {
  totalReviews: number;
  pendingReviews: number;
  avgRating: number | null;
  trend: "up" | "down" | "flat" | null;
};

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          aria-hidden="true"
          className={`${sz} ${s <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function SubRatingBar({ label, value }: { label: string; value: number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[0.62rem] text-slate-500">
      <span className="w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-slate-600 font-medium">{value.toFixed(1)}</span>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const date = new Date(review.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const isPending = review.status === "pending";

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{review.reviewer_name}</span>
            {isPending && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                Pending
              </span>
            )}
          </div>
          <StarRow rating={review.rating} />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{date}</span>
      </div>

      {review.title && (
        <h3 className="text-sm font-bold text-slate-900 mb-1">{review.title}</h3>
      )}
      {review.body && (
        <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>
      )}

      {(review.communication_rating || review.expertise_rating || review.value_for_money_rating) && (
        <div className="mt-3 space-y-1.5">
          <SubRatingBar label="Communication" value={review.communication_rating} />
          <SubRatingBar label="Expertise" value={review.expertise_rating} />
          <SubRatingBar label="Value for money" value={review.value_for_money_rating} />
        </div>
      )}
    </article>
  );
}

type Props = { advisor: Advisor | null };

export default function ReviewsTab({ advisor }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteDone, setInviteDone] = useState(false);

  useEffect(() => {
    if (!advisor) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFetchError("");
      try {
        const res = await fetch("/api/advisor-auth/reviews");
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json() as { reviews: ReviewRow[]; stats: ReviewStats };
            setReviews(data.reviews);
            setStats(data.stats);
          } else {
            setFetchError("Failed to load reviews.");
          }
        }
      } catch {
        if (!cancelled) setFetchError("Network error loading reviews.");
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [advisor]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviteSubmitting(true);
    setInviteError("");

    try {
      const res = await fetch("/api/advisor-auth/reviews/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() }),
      });

      if (res.ok) {
        setInviteDone(true);
        setInviteEmail("");
        setInviteName("");
      } else {
        const d = await res.json() as { error?: string };
        setInviteError(d.error ?? "Failed to send invitation.");
      }
    } catch {
      setInviteError("Network error. Please try again.");
    }

    setInviteSubmitting(false);
  };

  const approved = reviews.filter((r) => r.status === "approved");
  const pending = reviews.filter((r) => r.status === "pending");

  const trendIcon =
    stats?.trend === "up" ? "trending-up" :
    stats?.trend === "down" ? "trending-down" :
    "minus";
  const trendColor =
    stats?.trend === "up" ? "text-emerald-600" :
    stats?.trend === "down" ? "text-red-500" :
    "text-slate-400";

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-32 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Reviews</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Client reviews build trust and drive more enquiries. Invite past clients to share their experience.
        </p>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-slate-900">
            {stats?.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Avg rating</div>
          {stats?.avgRating != null && (
            <div className="flex justify-center mt-1.5">
              <StarRow rating={Math.round(stats.avgRating)} />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-slate-900">{stats?.totalReviews ?? 0}</div>
          <div className="text-xs text-slate-500 mt-0.5">Approved reviews</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <div className={`flex items-center justify-center gap-1 text-2xl font-extrabold ${trendColor}`}>
            <Icon name={trendIcon} size={22} />
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {stats?.trend === "up"
              ? "Improving trend"
              : stats?.trend === "down"
                ? "Declining trend"
                : "Stable trend"}
          </div>
          <div className="text-[0.58rem] text-slate-400 mt-0.5">vs previous 5 reviews</div>
        </div>
      </div>

      {/* ─── Invite form ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="send" size={15} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Send Review Invitation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Email a past client a direct link to leave you a review on your public profile.
            </p>
          </div>
        </div>

        {inviteDone ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="check" size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Invitation sent!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your client will receive an email with a link to leave a review.
              </p>
              <button
                onClick={() => setInviteDone(false)}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 underline"
              >
                Send another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { void handleInvite(e); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="rt-invite-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Client name *
                </label>
                <input
                  id="rt-invite-name"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Sarah Johnson"
                  maxLength={200}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label htmlFor="rt-invite-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Client email *
                </label>
                <input
                  id="rt-invite-email"
                  type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. sarah@example.com"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>

            {inviteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {inviteError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={inviteSubmitting || !inviteEmail.trim() || !inviteName.trim()}
                className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {inviteSubmitting ? (
                  <>
                    <div aria-hidden="true" className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Icon name="send" size={14} />
                    Send Invitation
                  </>
                )}
              </button>
              <p className="text-[0.62rem] text-slate-400">
                They will receive a direct link to your review page.
              </p>
            </div>
          </form>
        )}
      </div>

      {/* ─── Reviews list ─── */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            {pending.length} review{pending.length !== 1 ? "s" : ""} pending moderation
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            These will appear on your public profile once approved by our team.
          </p>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="star" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No reviews yet</h3>
          <p className="text-xs text-slate-500 mb-4">
            Send review invitations to your past clients to start building your reputation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approved.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Approved ({approved.length})
              </h3>
              <div className="space-y-3">
                {approved.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section className={approved.length > 0 ? "mt-4" : undefined}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Pending moderation ({pending.length})
              </h3>
              <div className="space-y-3">
                {pending.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

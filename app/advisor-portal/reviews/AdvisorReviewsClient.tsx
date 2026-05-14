"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReviewWithResponse } from "./page";

interface Props {
  advisorName: string;
  reviews: ReviewWithResponse[];
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          aria-hidden="true"
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
}: {
  review: ReviewWithResponse;
}) {
  const [responseText, setResponseText] = useState(review.advisor_response?.body ?? "");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedResponse, setSavedResponse] = useState(review.advisor_response);

  const isApproved = review.status === "approved";

  async function submitResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!responseText.trim() || responseText.trim().length < 10) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/advisor-portal/reviews/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: review.id, body: responseText.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const { response } = await res.json() as { response: ReviewWithResponse["advisor_response"] };
      setSavedResponse(response);
      setStatus("saved");
      setEditing(false);
    } catch {
      setStatus("error");
    }
  }

  const date = new Date(review.created_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">{review.reviewer_name}</span>
            {review.is_verified_client && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Verified client
              </span>
            )}
          </div>
          <StarRow rating={review.rating} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isApproved && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
              Pending
            </span>
          )}
          <span className="text-xs text-slate-400">{date}</span>
        </div>
      </div>

      {review.title && (
        <h3 className="text-sm font-bold text-slate-900 mb-1">{review.title}</h3>
      )}
      <p className="text-sm text-slate-600 leading-relaxed">{review.body}</p>

      {/* Response section — only for approved reviews */}
      {isApproved && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {savedResponse && !editing ? (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">
                Your response
              </p>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {savedResponse.body}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {new Date(savedResponse.updated_at).toLocaleDateString("en-AU", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <button
                onClick={() => {
                  setResponseText(savedResponse.body);
                  setEditing(true);
                  setStatus("idle");
                }}
                className="mt-2 text-xs text-emerald-600 hover:underline"
              >
                Edit response
              </button>
            </div>
          ) : (
            <form onSubmit={submitResponse}>
              <label
                htmlFor={`response-${review.id}`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {savedResponse ? "Edit your response" : "Respond publicly to this review"}
              </label>
              <p className="text-[10px] text-slate-400 mb-2">
                Responses are visible to anyone viewing your profile. Keep it
                professional and helpful (10–1000 characters).
              </p>
              <textarea
                id={`response-${review.id}`}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                minLength={10}
                maxLength={1000}
                placeholder={`Thank you for your feedback, ${review.reviewer_name}…`}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
              <div className="flex items-center justify-between mt-2 gap-2">
                <span className="text-[10px] text-slate-400">
                  {responseText.length}/1000
                </span>
                <div className="flex gap-2">
                  {savedResponse && (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={status === "saving" || responseText.trim().length < 10}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {status === "saving"
                      ? "Saving…"
                      : savedResponse
                        ? "Update response"
                        : "Publish response"}
                  </button>
                </div>
              </div>
              {status === "saved" && (
                <p className="text-xs text-emerald-600 mt-1">Response saved.</p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-600 mt-1">
                  Failed to save. Please try again.
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export default function AdvisorReviewsClient({ advisorName: _advisorName, reviews }: Props) {
  const approved = reviews.filter((r) => r.status === "approved");
  const pending = reviews.filter((r) => r.status === "pending");
  const unresponded = approved.filter((r) => !r.advisor_response);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/advisor-portal" className="hover:text-slate-900">
          ← Advisor portal
        </Link>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">My Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">
          Reviews submitted by your clients. Respond publicly to approved
          reviews to build trust with prospective clients.
        </p>
      </div>

      {unresponded.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">
            {unresponded.length} review{unresponded.length !== 1 ? "s" : ""} awaiting your
            response
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Advisors who respond to reviews convert 23% more profile visitors.
          </p>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-600 mb-1">No reviews yet</p>
          <p className="text-xs text-slate-400">
            Reviews appear here once clients submit them on your public profile.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Approved ({approved.length})
              </h2>
              <div className="space-y-3">
                {approved.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Pending moderation ({pending.length})
              </h2>
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

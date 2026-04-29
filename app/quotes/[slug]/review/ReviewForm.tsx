"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

interface Props {
  slug: string;
  token: string;
  advisorName: string;
  defaultDisplayName: string;
}

export default function ReviewForm({ slug, token, advisorName, defaultDisplayName }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Please pick a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${slug}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reviewer_email: email,
          rating,
          body: body.trim() || undefined,
          reviewer_display_name: displayName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit review.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
          <Icon name="check" size={24} />
        </div>
        <p className="font-bold text-slate-900 mb-1">Thanks for your review!</p>
        <p className="text-sm text-slate-500">It will appear on {advisorName}&apos;s profile shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Your rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
            >
              <Icon
                name="star"
                size={32}
                className={
                  (hover || rating) >= n
                    ? "text-amber-500 fill-amber-500"
                    : "text-slate-300"
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
          Email used to post the request
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="display" className="block text-sm font-semibold text-slate-700 mb-1">
          Display name (optional)
        </label>
        <input
          id="display"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="How should we display you (e.g. Jane S.)"
          maxLength={80}
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-semibold text-slate-700 mb-1">
          Your review (optional)
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="What was your experience like?"
        />
        <p className="text-xs text-slate-400 mt-1">{body.length}/2000</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold px-5 py-3 rounded-lg"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

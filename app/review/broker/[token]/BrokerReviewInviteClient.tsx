"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface BrokerInfo {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  rating: number | null;
}

function StarRating({
  value,
  onChange,
  label,
  required = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  required?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1">
        {label}
        {required && " *"}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl focus:outline-none transition-transform hover:scale-110"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <span
              className={
                (hover || value) >= star ? "text-amber-400" : "text-slate-200"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BrokerReviewInviteClient({ token }: { token: string }) {
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [feesRating, setFeesRating] = useState(0);
  const [platformRating, setPlatformRating] = useState(0);
  const [supportRating, setSupportRating] = useState(0);
  const [reliabilityRating, setReliabilityRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [experienceMonths, setExperienceMonths] = useState<number | "">("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/broker-review-invite?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          broker?: BrokerInfo;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && data.broker) setBroker(data.broker);
        else setLoadError(data.error ?? "Invalid or expired review link.");
      } catch {
        if (!cancelled) setLoadError("Failed to load — please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!rating) return setSubmitError("Please give an overall rating.");
    if (body.trim().length < 50)
      return setSubmitError("Review must be at least 50 characters.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/broker-review-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          fees_rating: feesRating || null,
          platform_rating: platformRating || null,
          support_rating: supportRating || null,
          reliability_rating: reliabilityRating || null,
          experience_months:
            typeof experienceMonths === "number" ? experienceMonths : null,
          title: title.trim() || null,
          body: body.trim(),
          display_name: displayName.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) setSubmitted(true);
      else setSubmitError(data.error ?? "Failed to submit. Please try again.");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !broker) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-bold text-slate-900 mb-2">
            Review link unavailable
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            {loadError ?? "This review link is invalid or has expired."}
          </p>
          <Link
            href="/compare"
            className="text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            Browse brokers →
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
            Thanks for sharing!
          </h1>
          <p className="text-sm text-slate-600 mb-1">
            Your review will be moderated before publishing — usually within 24
            hours.
          </p>
          <Link
            href={`/broker/${broker.slug}`}
            className="inline-block mt-4 px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 transition-colors"
          >
            View {broker.name}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="max-w-lg mx-auto px-4">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="text-sm font-bold text-slate-900 hover:text-slate-700"
          >
            Invest.com.au
          </Link>
          <p className="text-xs text-slate-400 mt-0.5">Broker Review</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
          {broker.logo_url ? (
            <Image
              src={broker.logo_url}
              alt={broker.name}
              width={56}
              height={56}
              className="rounded-xl object-contain w-14 h-14 bg-white shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
              {broker.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{broker.name}</p>
            <p className="text-xs text-slate-500">Share your experience</p>
          </div>
          {broker.rating ? (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-900">
                {broker.rating}
              </p>
              <p className="text-[0.6rem] text-slate-400">editor rating</p>
            </div>
          ) : null}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h1 className="text-lg font-extrabold text-slate-900 mb-1">
            Leave a review
          </h1>
          <p className="text-xs text-slate-500 mb-5">
            Helps other Australians choose. Honest reviews only — moderated
            before publishing.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <StarRating
              value={rating}
              onChange={setRating}
              label="Overall rating"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
              <StarRating
                value={feesRating}
                onChange={setFeesRating}
                label="Fees"
              />
              <StarRating
                value={platformRating}
                onChange={setPlatformRating}
                label="Platform"
              />
              <StarRating
                value={supportRating}
                onChange={setSupportRating}
                label="Support"
              />
              <StarRating
                value={reliabilityRating}
                onChange={setReliabilityRating}
                label="Reliability"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Review title{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Summarise your experience in one line"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Your review *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="What did they do well? What could be better? Fees, support, platform — anything useful to other readers."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <p
                className={`text-[0.6rem] mt-0.5 ${body.trim().length < 50 ? "text-slate-400" : "text-emerald-600"}`}
              >
                {body.trim().length} / 50 characters minimum
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Display name{" "}
                  <span className="text-slate-400 font-normal">
                    (or leave blank for Anonymous)
                  </span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  placeholder="Jane D."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Months using{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={experienceMonths}
                  onChange={(e) =>
                    setExperienceMonths(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="6"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>

            <p className="text-center text-[0.65rem] text-slate-400">
              Your email stays private. Reviews that look fake are removed.{" "}
              <Link href="/privacy" className="underline hover:text-slate-600">
                Privacy policy
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

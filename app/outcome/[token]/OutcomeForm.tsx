"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

interface Props {
  token: string;
  alreadySubmitted: boolean;
  initialOutcome: string | null;
  initialRating: number | null;
  initialTestimonial: string | null;
  initialShowTestimonial: boolean;
}

const OUTCOMES = [
  { value: "completed", label: "Completed — the pro helped me reach my goal", emoji: "✅" },
  { value: "in_progress", label: "Still in progress", emoji: "🟡" },
  { value: "switched_providers", label: "Switched to a different pro", emoji: "🔁" },
  { value: "abandoned", label: "Decided not to proceed", emoji: "⏸️" },
];

export default function OutcomeForm({
  token,
  alreadySubmitted,
  initialOutcome,
  initialRating,
  initialTestimonial,
  initialShowTestimonial,
}: Props) {
  const [outcome, setOutcome] = useState<string | null>(initialOutcome);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [testimonial, setTestimonial] = useState(initialTestimonial ?? "");
  const [showTestimonial, setShowTestimonial] = useState(initialShowTestimonial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!outcome) {
      setError("Pick an outcome to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/outcomes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          outcome,
          rating,
          testimonial: testimonial.trim() || null,
          show_testimonial: showTestimonial,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Submit failed");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-3">
          <Icon name="check" size={24} className="text-emerald-700" />
        </div>
        <h2 className="text-lg font-bold text-emerald-900 mb-1">Thanks for sharing</h2>
        <p className="text-sm text-emerald-800">
          Your update helps other Australians find the right pro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Outcome */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-3">
          What happened?
        </legend>
        <div className="space-y-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition-all ${
                outcome === o.value
                  ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-300"
                  : "border-slate-200 bg-white hover:border-amber-400"
              }`}
            >
              <span className="text-lg shrink-0">{o.emoji}</span>
              <span className="text-sm font-semibold text-slate-900">{o.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Rating */}
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 mb-3">
          Optional: rate the experience
        </legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`w-12 h-12 rounded-lg border text-xl transition-all ${
                rating !== null && rating >= n
                  ? "border-amber-500 bg-amber-50 text-amber-600"
                  : "border-slate-200 bg-white text-slate-300 hover:border-amber-300"
              }`}
              aria-label={`${n} out of 5`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      {/* Testimonial */}
      <fieldset>
        <label htmlFor="testimonial" className="block text-sm font-semibold text-slate-900 mb-2">
          Optional: a quick note (max 500 chars)
        </label>
        <textarea
          id="testimonial"
          value={testimonial}
          onChange={(e) => setTestimonial(e.target.value.slice(0, 500))}
          rows={4}
          placeholder="What went well? What could have gone better?"
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          {testimonial.length}/500
        </p>
        <label className="flex items-start gap-2 mt-2">
          <input
            type="checkbox"
            checked={showTestimonial}
            onChange={(e) => setShowTestimonial(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-xs text-slate-600">
            OK to show this anonymously on the pro&apos;s profile
            (your name + email stay private)
          </span>
        </label>
      </fieldset>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 font-bold text-base px-6 py-3 rounded-xl"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>

      <p className="text-[10px] text-slate-400 text-center">
        General information only — not personal advice.
      </p>
    </div>
  );
}

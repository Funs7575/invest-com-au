"use client";

import { useState } from "react";
import Link from "next/link";
import StarRatingInput from "./StarRatingInput";

interface UserReviewFormProps {
  brokerSlug: string;
  brokerName: string;
}

export default function UserReviewForm({ brokerSlug, brokerName }: UserReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (rating === 0) {
      setErrorMsg("Please select a star rating.");
      return;
    }
    if (!displayName.trim() || !email.trim() || !title.trim() || !body.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (!consent) {
      setErrorMsg("Please agree to the terms to continue.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/user-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker_slug: brokerSlug,
          display_name: displayName.trim(),
          email: email.trim(),
          rating,
          title: title.trim(),
          body: body.trim(),
          pros: pros.trim() || null,
          cons: cons.trim() || null,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <div className="text-2xl mb-2">📧</div>
        <h4 className="text-lg font-bold text-slate-900 mb-1">Check your inbox!</h4>
        <p className="text-sm text-slate-600">
          We&apos;ve sent a verification email to <strong>{email}</strong>.
          Click the link to confirm your review — it&apos;ll appear on this page once approved.
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold text-sm hover:bg-amber-100 transition-colors"
      >
        Write a Review of {brokerName}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h4 className="text-base font-bold text-slate-900">Write Your Review of {brokerName}</h4>

      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Your Rating <span className="text-red-500">*</span>
        </label>
        <StarRatingInput value={rating} onChange={setRating} size="lg" />
      </div>

      {/* Name & Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="review-name" className="block text-sm font-medium text-slate-700 mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            id="review-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sarah M."
            maxLength={50}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:border-blue-700"
          />
        </div>
        <div>
          <label htmlFor="review-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="review-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            maxLength={254}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:border-blue-700"
          />
          <p className="text-xs text-slate-400 mt-1">For verification only — never displayed.</p>
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="review-title" className="block text-sm font-medium text-slate-700 mb-1">
          Review Title <span className="text-red-500">*</span>
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarise your experience in a few words"
          maxLength={120}
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:border-blue-700"
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="review-body" className="block text-sm font-medium text-slate-700 mb-1">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What was your experience using this broker? What did you like or dislike?"
          rows={4}
          maxLength={2000}
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-y"
        />
        <p className="text-xs text-slate-400 mt-1 text-right">{body.length}/2000</p>
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="review-pros" className="block text-sm font-medium text-slate-700 mb-1">
            Pros <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="review-pros"
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            placeholder="What did you like?"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-y"
          />
        </div>
        <div>
          <label htmlFor="review-cons" className="block text-sm font-medium text-slate-700 mb-1">
            Cons <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="review-cons"
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            placeholder="What could be improved?"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-y"
          />
        </div>
      </div>

      {/* Consent */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-700 shrink-0"
        />
        <span className="text-xs text-slate-500 leading-tight">
          I confirm this review is based on my genuine experience. I agree to the{" "}
          <Link href="/privacy" className="underline hover:text-slate-900">
            Privacy Policy
          </Link>
          . My email will only be used for verification.
        </span>
      </label>

      {/* Error */}
      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          {status === "loading" ? "Submitting..." : "Submit Review"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

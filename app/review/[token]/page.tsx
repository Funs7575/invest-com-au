"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

type AdvisorInfo = {
  id: number;
  name: string;
  slug: string;
  photo_url: string | null;
  type: string;
  firm_name: string | null;
  location_display: string | null;
  rating: number;
  review_count: number;
};

const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  financial_planner: "Financial Planner",
  accountant: "Accountant",
  mortgage_broker: "Mortgage Broker",
  investment_advisor: "Investment Advisor",
  insurance_broker: "Insurance Broker",
  financial_coach: "Financial Coach",
};

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl focus:outline-none transition-transform hover:scale-110"
          >
            <span className={(hover || value) >= star ? "text-amber-400" : "text-slate-200"}>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();

  const [advisor, setAdvisor] = useState<AdvisorInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [expertiseRating, setExpertiseRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [usedServices, setUsedServices] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/review-token?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          setAdvisor(data.advisor);
        } else {
          const d = await res.json();
          setLoadError(d.error || "Invalid or expired review link.");
        }
      } catch {
        setLoadError("Failed to load. Please try again.");
      }
      setLoading(false);
    };
    if (token) load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisor) return;

    setSubmitError("");

    if (!rating) { setSubmitError("Please select an overall rating."); return; }
    if (!communicationRating || !expertiseRating || !valueRating) {
      setSubmitError("Please rate all three categories."); return;
    }
    if (body.trim().length < 50) {
      setSubmitError("Your review must be at least 50 characters. Tell us more!"); return;
    }
    if (usedServices === null) {
      setSubmitError("Please indicate whether you used this advisor's services."); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/advisor-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: advisor.id,
          rating,
          communication_rating: communicationRating,
          expertise_rating: expertiseRating,
          value_for_money_rating: valueRating,
          title: title.trim() || undefined,
          body: body.trim(),
          reviewer_name: reviewerName.trim() || undefined,
          reviewer_email: reviewerEmail.trim() || undefined,
          used_services: usedServices,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setSubmitError(data.error || "Failed to submit review. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !advisor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Invalid Review Link</h1>
          <p className="text-sm text-slate-500 mb-4">{loadError || "This review link is invalid or has expired."}</p>
          <Link href="/advisors" className="text-sm text-violet-600 hover:text-violet-800 font-medium">Browse advisors →</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Thank you!</h1>
          <p className="text-sm text-slate-600 mb-1">Your review has been submitted.</p>
          <p className="text-xs text-slate-400 mb-6">It will be moderated by our team before being published — usually within 24 hours.</p>
          <Link
            href={`/advisor/${advisor.slug}`}
            className="inline-block px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 transition-colors"
          >
            View {advisor.name}&apos;s profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="text-sm font-bold text-slate-900 hover:text-slate-700">Invest.com.au</Link>
          <p className="text-xs text-slate-400 mt-0.5">Advisor Review</p>
        </div>

        {/* Advisor card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <Image
            src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=160&background=f59e0b&color=fff&bold=true`}
            alt={advisor.name}
            width={56}
            height={56}
            className="rounded-xl object-cover w-14 h-14 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{advisor.name}</p>
            <p className="text-xs text-amber-600 font-medium">{PROFESSIONAL_TYPE_LABELS[advisor.type] || advisor.type}</p>
            {advisor.firm_name && <p className="text-xs text-slate-500 truncate">{advisor.firm_name}</p>}
          </div>
          {advisor.rating > 0 && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-900">{advisor.rating}</p>
              <p className="text-[0.6rem] text-slate-400">{advisor.review_count} reviews</p>
            </div>
          )}
        </div>

        {/* Review form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h1 className="text-lg font-extrabold text-slate-900 mb-1">Leave a review</h1>
          <p className="text-xs text-slate-500 mb-5">Your honest review helps other Australians find the right financial professional.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Overall rating */}
            <StarRating value={rating} onChange={setRating} label="Overall rating *" />

            {/* Sub-ratings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 rounded-xl p-4">
              <StarRating value={communicationRating} onChange={setCommunicationRating} label="Communication *" />
              <StarRating value={expertiseRating} onChange={setExpertiseRating} label="Expertise *" />
              <StarRating value={valueRating} onChange={setValueRating} label="Value for money *" />
            </div>

            {/* Used services */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Did you use this advisor&apos;s services? *</p>
              <div className="flex gap-3">
                {[{ label: "Yes", value: true }, { label: "No — just consulted", value: false }].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setUsedServices(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${usedServices === opt.value ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Review title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review title <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Summarise your experience in one line"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Review body */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Your review *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                minLength={50}
                placeholder="Tell others about your experience — what did they do well? Would you recommend them?"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <p className={`text-[0.6rem] mt-0.5 ${body.trim().length < 50 ? "text-slate-400" : "text-emerald-600"}`}>
                {body.trim().length} / 50 characters minimum
              </p>
            </div>

            {/* Reviewer details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your name <span className="text-slate-400 font-normal">(or leave blank for Anonymous)</span></label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  maxLength={80}
                  placeholder="Jane D."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email <span className="text-slate-400 font-normal">(not published, helps prevent duplicates)</span></label>
                <input
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{submitError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>

            <p className="text-center text-[0.65rem] text-slate-400">
              Reviews are moderated before publishing. Your email is never shared.{" "}
              <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

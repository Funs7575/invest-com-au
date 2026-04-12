"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import Icon from "@/components/Icon";

interface IncentiveData {
  eligible: boolean;
  has_pro: boolean;
  brokers_to_review: string[];
  brokers_reviewed: string[];
  reward: string;
}

export default function WriteReviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledBroker = searchParams.get("broker") || "";
  const { user, loading: userLoading } = useUser();

  // Incentive data
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [loadingIncentive, setLoadingIncentive] = useState(true);

  // Form state
  const [step, setStep] = useState(1);
  const [brokerSlug, setBrokerSlug] = useState(prefilledBroker);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pros, setPros] = useState(["", "", ""]);
  const [cons, setCons] = useState(["", "", ""]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchIncentiveData = useCallback(async () => {
    try {
      const res = await fetch("/api/review-incentive");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setIncentiveData(data);
    } catch {
      // Non-blocking
    } finally {
      setLoadingIncentive(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/auth/login?next=/reviews/write");
      return;
    }
    fetchIncentiveData();
  }, [user, userLoading, router, fetchIncentiveData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/review-incentive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker_slug: brokerSlug,
          rating,
          title: title.trim(),
          body: body.trim(),
          pros: pros.filter((p) => p.trim().length > 0),
          cons: cons.filter((c) => c.trim().length > 0),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit review. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = brokerSlug.length > 0;
  const canProceedStep2 = rating > 0 && title.trim().length >= 5 && body.trim().length >= 100;

  if (userLoading || !user) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-64" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="check-circle" size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Review Submitted!</h1>
            <p className="text-sm text-slate-600 mb-4">
              Your review is pending approval. Pro access will be activated within 24 hours.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Our team reviews every submission to ensure quality. You will receive an email once approved.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/reviews"
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                View All Reviews
              </Link>
              <Link
                href="/account"
                className="px-6 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                My Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-500 mb-4">
          <Link href="/reviews" className="hover:text-slate-900">Reviews</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Write a Review</span>
        </nav>

        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Icon name="star" size={20} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Write a verified review. Get 1 month of Pro free.</h1>
              <p className="text-sm text-slate-600 mt-1">
                Share your honest experience with an Australian broker. Approved reviews earn
                1 month of Investor Pro at no cost.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="md:col-span-2 space-y-4">
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step >= s
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step > s ? (
                      <Icon name="check-circle" size={14} className="text-white" />
                    ) : (
                      s
                    )}
                  </div>
                  {s < 3 && (
                    <div className={`w-12 h-0.5 ${step > s ? "bg-emerald-300" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Select Broker */}
            {step === 1 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">Step 1: Select a Broker</h2>
                <p className="text-sm text-slate-500 mb-4">Choose the broker you want to review.</p>

                {loadingIncentive ? (
                  <div className="animate-pulse h-10 bg-slate-100 rounded-lg" />
                ) : (
                  <select
                    value={brokerSlug}
                    onChange={(e) => setBrokerSlug(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select a broker...</option>
                    {(incentiveData?.brokers_to_review || []).map((slug) => (
                      <option key={slug} value={slug}>
                        {slug
                          .split("-")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </option>
                    ))}
                  </select>
                )}

                {incentiveData?.brokers_reviewed && incentiveData.brokers_reviewed.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    You have already reviewed {incentiveData.brokers_reviewed.length} broker{incentiveData.brokers_reviewed.length !== 1 ? "s" : ""}.
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Write Review */}
            {step === 2 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">Step 2: Write Your Review</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Reviewing: <span className="font-semibold text-slate-700">
                    {brokerSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </span>
                </p>

                {/* Star Rating */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <svg
                          className={`w-8 h-8 ${
                            star <= (hoverRating || rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-200 fill-slate-200"
                          } transition-colors`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-sm font-semibold text-slate-600">
                        {rating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Review Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarise your experience in a sentence"
                    maxLength={200}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">{title.length}/200</p>
                </div>

                {/* Body */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Review</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Share your detailed experience with this broker. What did you like? What could be improved? How are the fees, platform, and support?"
                    rows={6}
                    maxLength={5000}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className={`text-xs mt-1 ${body.length < 100 ? "text-amber-600" : "text-slate-400"}`}>
                    {body.length}/5000 {body.length < 100 && `(minimum 100 characters, ${100 - body.length} more needed)`}
                  </p>
                </div>

                {/* Pros */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pros (optional)</label>
                  {pros.map((pro, i) => (
                    <input
                      key={i}
                      type="text"
                      value={pro}
                      onChange={(e) => {
                        const updated = [...pros];
                        updated[i] = e.target.value;
                        setPros(updated);
                      }}
                      placeholder={`Pro ${i + 1}`}
                      maxLength={150}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ))}
                </div>

                {/* Cons */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cons (optional)</label>
                  {cons.map((con, i) => (
                    <input
                      key={i}
                      type="text"
                      value={con}
                      onChange={(e) => {
                        const updated = [...cons];
                        updated[i] = e.target.value;
                        setCons(updated);
                      }}
                      placeholder={`Con ${i + 1}`}
                      maxLength={150}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ))}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Submit */}
            {step === 3 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-base font-bold text-slate-900 mb-3">Step 3: Preview & Submit</h2>
                <p className="text-sm text-slate-500 mb-4">Review your submission before publishing.</p>

                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  {/* Broker name */}
                  <p className="text-xs text-slate-500 mb-1">Broker</p>
                  <p className="text-sm font-semibold text-slate-900 mb-3">
                    {brokerSlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1.5 text-sm font-semibold text-slate-600">{rating}/5</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>

                  {/* Body */}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{body}</p>

                  {/* Pros */}
                  {pros.filter((p) => p.trim()).length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Pros</p>
                      <ul className="space-y-0.5">
                        {pros.filter((p) => p.trim()).map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600">
                            <Icon name="check-circle" size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cons */}
                  {cons.filter((c) => c.trim()).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1">Cons</p>
                      <ul className="space-y-0.5">
                        {cons.filter((c) => c.trim()).map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600">
                            <span className="text-red-400 mt-0.5 shrink-0">-</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Edit Review
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — Guidelines */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Review Guidelines</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-xs text-slate-600">
                  <Icon name="check-circle" size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Be honest</span> — share your genuine experience, both positive and negative.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-slate-600">
                  <Icon name="check-circle" size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Minimum 100 characters</span> — provide enough detail for others to learn from.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-slate-600">
                  <Icon name="check-circle" size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Include specific details</span> — mention fees, platform experience, support quality.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-slate-600">
                  <Icon name="check-circle" size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">One review per broker</span> — you can review multiple brokers.</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="award" size={16} className="text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Your Reward</h3>
              </div>
              <p className="text-xs text-slate-600">
                Approved reviews earn <span className="font-semibold text-amber-700">1 month of Investor Pro</span> including
                fee alerts, advanced comparison tools, monthly market briefs, and ad-free browsing.
              </p>
            </div>

            {incentiveData && !incentiveData.has_pro && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="crown" size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Not a Pro member?</h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Submit your first review to unlock Pro features at no cost.
                </p>
                <p className="text-xs text-emerald-700 font-semibold">
                  {incentiveData.brokers_to_review.length} brokers available to review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

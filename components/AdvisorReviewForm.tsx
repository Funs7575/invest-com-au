"use client";

import { useState } from "react";

interface AdvisorReviewFormProps {
  professionalId: number;
  advisorName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function StarRatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div>
      <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">{label}</label>
      <div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            className={`text-lg transition-colors ${
              star <= (hovered || value) ? "text-amber-400" : "text-slate-200 hover:text-amber-200"
            }`}
          >
            ★
          </button>
        ))}
        {value > 0 && <span className="text-[0.6rem] text-slate-400 ml-1 self-center">{value}/5</span>}
      </div>
    </div>
  );
}

export default function AdvisorReviewForm({ professionalId, advisorName, onSuccess, onCancel }: AdvisorReviewFormProps) {
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Form fields
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [expertiseRating, setExpertiseRating] = useState(0);
  const [valueForMoneyRating, setValueForMoneyRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [usedServices, setUsedServices] = useState<boolean | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");

  const firstName = advisorName.split(" ")[0];
  const bodyLength = reviewBody.trim().length;
  const isBodyValid = bodyLength >= 50;

  const canSubmit =
    overallRating > 0 &&
    communicationRating > 0 &&
    expertiseRating > 0 &&
    valueForMoneyRating > 0 &&
    isBodyValid &&
    usedServices !== null &&
    state !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setErrorMsg("");
    setState("submitting");

    try {
      const res = await fetch("/api/advisor-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: professionalId,
          reviewer_name: reviewerName.trim() || "Anonymous",
          rating: overallRating,
          communication_rating: communicationRating,
          expertise_rating: expertiseRating,
          value_for_money_rating: valueForMoneyRating,
          title: reviewTitle.trim() || undefined,
          body: reviewBody.trim(),
          used_services: usedServices,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to submit review. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  };

  return (
    <div className="border-t border-slate-100 pt-4">
      <h3 className="text-xs font-bold text-slate-700 mb-3">
        Share Your Experience with {firstName}
      </h3>

      <div className="space-y-3">
        {/* Star ratings grid */}
        <div className="grid grid-cols-2 gap-3">
          <StarRatingInput label="Overall *" value={overallRating} onChange={setOverallRating} />
          <StarRatingInput label="Communication *" value={communicationRating} onChange={setCommunicationRating} />
          <StarRatingInput label="Expertise *" value={expertiseRating} onChange={setExpertiseRating} />
          <StarRatingInput label="Value for Money *" value={valueForMoneyRating} onChange={setValueForMoneyRating} />
        </div>

        {/* Used services toggle */}
        <div>
          <label className="block text-[0.62rem] font-semibold text-slate-600 mb-1">
            Did you use {firstName}&apos;s services? *
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUsedServices(true)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                usedServices === true
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setUsedServices(false)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                usedServices === false
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Reviewer name */}
        <div>
          <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">
            Your name <span className="text-slate-400 font-normal">(optional, defaults to &quot;Anonymous&quot;)</span>
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Anonymous"
            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">
            Title <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={reviewTitle}
            onChange={(e) => setReviewTitle(e.target.value)}
            placeholder="Summary of your experience"
            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
          />
        </div>

        {/* Review body */}
        <div>
          <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">
            Your review *
          </label>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            rows={4}
            placeholder="What was your experience working with this advisor? (minimum 50 characters)"
            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-vertical"
          />
          <div className="flex justify-between mt-0.5">
            {bodyLength > 0 && bodyLength < 50 && (
              <p className="text-[0.56rem] text-amber-600">
                {50 - bodyLength} more character{50 - bodyLength !== 1 ? "s" : ""} needed
              </p>
            )}
            {bodyLength >= 50 && (
              <p className="text-[0.56rem] text-emerald-600">Minimum reached</p>
            )}
            <p className="text-[0.56rem] text-slate-400 ml-auto">{bodyLength} / 50 min</p>
          </div>
        </div>

        {/* Error message */}
        {state === "error" && errorMsg && (
          <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {state === "submitting" ? "Submitting..." : "Submit Review"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            Cancel
          </button>
        </div>

        <p className="text-[0.56rem] text-slate-400 leading-relaxed">
          Reviews are moderated before publication. Your name will be displayed publicly; if left blank it will show as &quot;Anonymous&quot;.
        </p>
      </div>
    </div>
  );
}

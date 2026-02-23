"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StarRatingInput from "./StarRatingInput";
import { createClient } from "@/lib/supabase/client";

interface BrokerOption {
  slug: string;
  name: string;
}

interface SwitchStoryFormProps {
  /** Pre-fill destination broker (when on a broker page) */
  destBrokerSlug?: string;
  destBrokerName?: string;
  /** Pre-fill source broker (when on a broker page, story is about leaving) */
  sourceBrokerSlug?: string;
  sourceBrokerName?: string;
}

export default function SwitchStoryForm({
  destBrokerSlug,
  destBrokerName,
  sourceBrokerSlug,
  sourceBrokerName,
}: SwitchStoryFormProps) {
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);
  const [sourceBroker, setSourceBroker] = useState(sourceBrokerSlug || "");
  const [destBroker, setDestBroker] = useState(destBrokerSlug || "");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  const [sourceRating, setSourceRating] = useState(0);
  const [destRating, setDestRating] = useState(0);
  const [estimatedSavings, setEstimatedSavings] = useState("");
  const [timeWithSource, setTimeWithSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch broker list for dropdowns
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("brokers")
      .select("slug, name")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        if (data) setBrokers(data);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!sourceBroker) {
      setErrorMsg("Please select which broker you left.");
      return;
    }
    if (!destBroker) {
      setErrorMsg("Please select which broker you switched to.");
      return;
    }
    if (sourceBroker === destBroker) {
      setErrorMsg("Source and destination brokers must be different.");
      return;
    }
    if (sourceRating === 0 || destRating === 0) {
      setErrorMsg("Please rate both brokers.");
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
      const res = await fetch("/api/switch-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_broker_slug: sourceBroker,
          dest_broker_slug: destBroker,
          display_name: displayName.trim(),
          email: email.trim(),
          title: title.trim(),
          body: body.trim(),
          reason: reason.trim() || null,
          source_rating: sourceRating,
          dest_rating: destRating,
          estimated_savings: estimatedSavings.trim() || null,
          time_with_source: timeWithSource.trim() || null,
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
          Click the link to confirm your story — it&apos;ll appear on this page once approved.
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 font-semibold text-sm hover:bg-blue-100 transition-colors"
      >
        Share Your Switching Story
      </button>
    );
  }

  // Filter broker options for dropdowns
  const sourceOptions = brokers.filter((b) => b.slug !== destBroker);
  const destOptions = brokers.filter((b) => b.slug !== sourceBroker);

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h4 className="text-base font-bold text-slate-900">Share Your Switching Story</h4>
      <p className="text-xs text-slate-500 -mt-2">Switched brokers? Tell others about your experience.</p>

      {/* Broker Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="story-source" className="block text-sm font-medium text-slate-700 mb-1">
            Broker You Left <span className="text-red-500">*</span>
          </label>
          {sourceBrokerSlug && sourceBrokerName ? (
            <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
              {sourceBrokerName}
            </div>
          ) : (
            <select
              id="story-source"
              value={sourceBroker}
              onChange={(e) => setSourceBroker(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 bg-white"
            >
              <option value="">Select broker...</option>
              {sourceOptions.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label htmlFor="story-dest" className="block text-sm font-medium text-slate-700 mb-1">
            Broker You Switched To <span className="text-red-500">*</span>
          </label>
          {destBrokerSlug && destBrokerName ? (
            <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
              {destBrokerName}
            </div>
          ) : (
            <select
              id="story-dest"
              value={destBroker}
              onChange={(e) => setDestBroker(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 bg-white"
            >
              <option value="">Select broker...</option>
              {destOptions.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Star Ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Rate Old Broker <span className="text-red-500">*</span>
          </label>
          <StarRatingInput value={sourceRating} onChange={setSourceRating} size="md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Rate New Broker <span className="text-red-500">*</span>
          </label>
          <StarRatingInput value={destRating} onChange={setDestRating} size="md" />
        </div>
      </div>

      {/* Name & Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="story-name" className="block text-sm font-medium text-slate-700 mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            id="story-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Sarah M."
            maxLength={50}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
        </div>
        <div>
          <label htmlFor="story-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="story-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            maxLength={254}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
          <p className="text-xs text-slate-400 mt-1">For verification only — never displayed.</p>
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="story-title" className="block text-sm font-medium text-slate-700 mb-1">
          Story Title <span className="text-red-500">*</span>
        </label>
        <input
          id="story-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Why I left CommSec for Stake"
          maxLength={120}
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="story-body" className="block text-sm font-medium text-slate-700 mb-1">
          Your Story <span className="text-red-500">*</span>
        </label>
        <textarea
          id="story-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us about your switch — what prompted it, how the transition went, and whether you're happy with the change."
          rows={5}
          maxLength={2000}
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-y"
        />
        <p className="text-xs text-slate-400 mt-1 text-right">{body.length}/2000</p>
      </div>

      {/* Reason */}
      <div>
        <label htmlFor="story-reason" className="block text-sm font-medium text-slate-700 mb-1">
          Main Reason for Switching <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="story-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Lower fees, better app, CHESS sponsorship"
          maxLength={500}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
        />
      </div>

      {/* Optional extras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="story-savings" className="block text-sm font-medium text-slate-700 mb-1">
            Estimated Savings <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="story-savings"
            type="text"
            value={estimatedSavings}
            onChange={(e) => setEstimatedSavings(e.target.value)}
            placeholder="e.g. $500/year"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
        </div>
        <div>
          <label htmlFor="story-time" className="block text-sm font-medium text-slate-700 mb-1">
            Time with Old Broker <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="story-time"
            type="text"
            value={timeWithSource}
            onChange={(e) => setTimeWithSource(e.target.value)}
            placeholder="e.g. 3 years"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
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
          I confirm this story is based on my genuine experience. I agree to the{" "}
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
          {status === "loading" ? "Submitting..." : "Submit Story"}
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

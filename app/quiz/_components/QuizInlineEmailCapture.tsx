"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface Props {
  onSubmit: (email: string, name: string) => Promise<void> | void;
  status: "idle" | "loading" | "submitted" | "error";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Post-results inline email capture. Replaces the previous full-screen
 * QuizEmailGate that blocked results until the user submitted — the gate
 * forced cold capture, which is a 20–40% drop-off tax for marginally
 * higher capture rate on a smaller pool.
 *
 * This component renders inside the results screen below the broker /
 * cross-sell content, so the user has already seen the value before being
 * asked. Dismissable. On success, swaps to a thank-you state.
 */
export default function QuizInlineEmailCapture({ onSubmit, status }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isValidEmail = EMAIL_REGEX.test(email.trim());
  const isLoading = status === "loading";
  const canSubmit = isValidEmail && !isLoading;

  if (dismissed) return null;

  // Success state — replace the form with a thank-you so the user knows
  // their submission landed.
  if (status === "submitted") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6 flex items-start gap-3 result-card-in result-card-in-delay-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Icon name="check" size={18} className="text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-bold text-emerald-900">
            Sent — check your inbox
          </p>
          <p className="text-xs md:text-sm text-emerald-700 mt-0.5 leading-relaxed">
            Your PDF shortlist is on the way to <strong>{email}</strong>. We&rsquo;ll keep you posted on deal alerts for matching platforms — unsubscribe any time.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    await onSubmit(email.trim(), name.trim());
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6 result-card-in result-card-in-delay-3">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="download" size={18} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-bold text-slate-900">
            Want a PDF copy emailed to you?
          </h3>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5">
            Top match, fee breakdown, and next-step checklist — plus deal alerts when matching platforms launch new offers.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss email capture"
          className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Form — compact stacked layout, mobile-friendly */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="First name (optional)"
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 sm:w-32 md:w-40"
        />
        <input
          type="email"
          placeholder="you@email.com"
          autoComplete="email"
          aria-label="Email address for quiz results"
          aria-invalid={touched && !isValidEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          disabled={isLoading}
          className={`flex-1 px-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 ${
            touched && !isValidEmail && email.length > 0
              ? "border-red-400 focus:border-red-400"
              : "border-slate-200 focus:border-amber-500"
          }`}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? "Sending…" : "Email me the PDF →"}
        </button>
      </div>

      {touched && !isValidEmail && email.length > 0 && (
        <p className="text-[0.65rem] text-red-600 mt-1.5">
          Please enter a valid email address.
        </p>
      )}

      {status === "error" && (
        <p className="text-[0.65rem] text-red-600 mt-1.5">
          Something went wrong — please try again. Your results are still on this page.
        </p>
      )}

      <p className="text-[0.6rem] text-slate-500 mt-2 leading-relaxed">
        No spam. Unsubscribe any time.{" "}
        <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>
      </p>
    </div>
  );
}

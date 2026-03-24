"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  onSubmit: (email: string, name: string) => void;
  onSkip: () => void;
  status: "idle" | "loading" | "error";
}

export default function QuizEmailGate({ onSubmit, onSkip, status }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const canSubmit = email.includes("@") && email.includes(".");

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Icon + heading */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold mb-1">Unlock your personalised report</h2>
          <p className="text-sm text-slate-500">
            Get your shortlist + our free fee comparison guide emailed to you.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm">
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Alex"
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                aria-label="Email address for quiz results"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) onSubmit(email, name); }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>

          {status === "error" && (
            <p className="text-xs text-red-500 mb-3">Something went wrong — results still available below.</p>
          )}

          <button
            onClick={() => canSubmit && onSubmit(email, name)}
            disabled={!canSubmit || status === "loading"}
            className="w-full py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Show My Results →"}
          </button>

          <p className="text-[0.6rem] text-slate-400 mt-2 text-center">
            By submitting, you consent to receiving emails from Invest.com.au. No spam. Unsubscribe anytime.{" "}
            <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
          </p>
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
          >
            Skip — show results without email
          </button>
        </div>
      </div>
    </div>
  );
}

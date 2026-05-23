"use client";

import { useState, type FormEvent } from "react";
import { PDS_CONSIDERATION } from "@/lib/compliance";

interface Props {
  /** Which product the rate alert applies to. */
  productKind: "savings_account" | "term_deposit";
  /** Override the default heading copy. */
  heading?: string;
  /** Override the default subhead copy. */
  body?: string;
  /** Pre-fill the threshold input (in %). The user can still edit. */
  defaultThresholdPct?: number;
  /** Tailwind classes to merge onto the wrapper. */
  className?: string;
}

const PRODUCT_LABELS: Record<Props["productKind"], string> = {
  savings_account: "savings account",
  term_deposit: "term deposit",
};

const DEFAULT_HEADINGS: Record<Props["productKind"], string> = {
  savings_account: "Get alerted when savings rates beat your target",
  term_deposit: "Get alerted when term-deposit rates beat your target",
};

const DEFAULT_BODY =
  "We'll email you the moment an Australian bank pushes its rate above your threshold. Double-opt-in, unsubscribe in one click.";

// FIN_NOTEBOOK Revenue #4 capture component. Drop into /savings,
// /term-deposits, and any /best/* page that ranks rate-driven products.
// Pairs with /api/rate-alerts (POST). Verification + unsubscribe flow
// lives at /rate-alerts (token-driven GET).
export default function RateAlertCapture({
  productKind,
  heading,
  body,
  defaultThresholdPct,
  className = "",
}: Props) {
  const [email, setEmail] = useState("");
  const [thresholdPct, setThresholdPct] = useState<string>(
    defaultThresholdPct !== undefined ? defaultThresholdPct.toFixed(2) : "",
  );
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const pct = Number.parseFloat(thresholdPct);
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 50) {
      setError("Enter a rate between 0% and 50%.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/rate-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          product_kind: productKind,
          threshold_pct: pct,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 ${className}`}
      >
        ✓ Almost there — check your inbox for a confirmation email.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="text-base font-semibold text-slate-900">
        {heading ?? DEFAULT_HEADINGS[productKind]}
      </h3>
      <p className="mt-1 text-sm text-slate-600">{body ?? DEFAULT_BODY}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,140px,auto]">
        <label className="text-sm">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </label>

        <label className="text-sm">
          <span className="sr-only">Target rate</span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.05"
              min="0"
              max="50"
              value={thresholdPct}
              onChange={(e) => setThresholdPct(e.target.value)}
              placeholder="5.25"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              aria-label={`Target ${PRODUCT_LABELS[productKind]} rate in percent per annum`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">
              % p.a.
            </span>
          </div>
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
        >
          {status === "sending" ? "Setting…" : "Alert me"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        We&apos;ll only email you when a {PRODUCT_LABELS[productKind]} crosses your
        threshold. One email per match, max one per day.
      </p>

      <p className="mt-2 text-xs text-slate-400">{PDS_CONSIDERATION}</p>
    </form>
  );
}

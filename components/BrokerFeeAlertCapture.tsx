"use client";

import { useState, type FormEvent } from "react";

interface Props {
  /** The broker slug — pre-populated in the subscription payload. */
  brokerSlug: string;
  /** Human-readable broker name for copy. */
  brokerName: string;
  /** Additional Tailwind classes for the wrapper. */
  className?: string;
}

/**
 * Inline fee-change alert capture for /broker/[slug].
 *
 * Sits next to FeesFreshnessIndicator inside the Sources & Verification
 * block. Calls /api/fee-alerts (POST) with a pre-filled broker slug so
 * the user receives an email the moment that broker's fees change.
 *
 * Factual notification only — no financial advice copy.
 */
export default function BrokerFeeAlertCapture({
  brokerSlug,
  brokerName,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/fee-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          brokerSlugs: [brokerSlug],
          alertType: "any",
          frequency: "instant",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error — please try again.");
    }
  }

  if (status === "done") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 text-xs text-emerald-700 ${className}`}
      >
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Alert set — check your inbox.
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-700 transition-colors ${className}`}
        aria-label={`Get notified when ${brokerName} changes fees`}
      >
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Get notified when {brokerName} changes fees
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`mt-2 flex flex-wrap items-start gap-2 ${className}`}
      aria-label={`Fee change alert for ${brokerName}`}
    >
      <label className="sr-only" htmlFor="fee-alert-email">
        Email address for fee alerts
      </label>
      <input
        id="fee-alert-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 min-w-0 w-48"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 transition-colors"
      >
        {status === "sending" ? "Setting…" : "Alert me"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setErrorMsg(null); }}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Cancel"
      >
        Cancel
      </button>
      {errorMsg && (
        <p role="alert" className="w-full text-xs text-red-700 mt-0.5">
          {errorMsg}
        </p>
      )}
      <p className="w-full text-[0.65rem] text-slate-400 leading-snug">
        One email per fee change. Unsubscribe in one click.
      </p>
    </form>
  );
}

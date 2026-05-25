"use client";

import { useState, type FormEvent } from "react";

interface Props {
  /** Tailwind classes to merge onto the wrapper. */
  className?: string;
}

/**
 * F4: Fee-change alert capture for /compare.
 *
 * Subscribers receive an email whenever any monitored Australian broker
 * changes a published fee (brokerage, FX, custody, etc.).
 * Pairs with /api/fee-alerts (POST + double-opt-in verify flow).
 */
export default function FeeAlertCapture({ className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
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
        body: JSON.stringify({ email }),
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
      <div
        role="status"
        aria-live="polite"
        className={`rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 ${className}`}
      >
        ✓ Almost there — check your inbox to confirm your fee-alert subscription.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
      aria-label="Subscribe to broker fee change alerts"
    >
      <h3 className="text-base font-semibold text-slate-900">
        Get alerted when broker fees change
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        We monitor Australian broker fee schedules daily. Enter your email and
        we&apos;ll notify you the moment a fee goes up or down — double-opt-in,
        unsubscribe in one click.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <label className="flex-1 text-sm">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={status === "sending"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending" || !email}
          className="shrink-0 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {status === "sending" ? "Setting up…" : "Alert me"}
        </button>
      </div>

      {errorMsg && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        We&apos;ll email you when any Australian broker updates their published fee
        schedule. One email per change, unsubscribe any time.
      </p>
    </form>
  );
}

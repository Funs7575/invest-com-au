"use client";

import { useState, type FormEvent } from "react";

interface Props {
  brokerSlug: string;
  brokerName: string;
  /** When true the widget is rendered in a compact strip layout */
  compact?: boolean;
  className?: string;
}

/**
 * Inline fee-change alert sign-up.
 * Submits to /api/fee-alerts with the specific broker pre-selected.
 * Works for any broker type (unlike RateAlertCapture which is rate-only).
 */
export default function FeeAlertCapture({ brokerSlug, brokerName, compact, className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/fee-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, brokerSlugs: [brokerSlug], alertType: "any", frequency: "immediate" }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    }
  }

  if (status === "done") {
    return (
      <div role="status" aria-live="polite" className={`rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${className}`}>
        ✓ Subscribed. We&apos;ll email you if {brokerName} changes their fees.
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={submit} className={`flex flex-wrap items-center gap-2 ${className}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
          placeholder="your@email.com"
          required
          autoComplete="email"
          aria-label="Email for fee alerts"
          disabled={status === "sending"}
          className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
        >
          {status === "sending" ? "Saving…" : "Alert me"}
        </button>
        {error && <p role="alert" className="w-full text-xs text-red-700">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl shrink-0" aria-hidden>🔔</span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Get notified when {brokerName} changes fees</h3>
          <p className="text-xs text-slate-500 mt-0.5">One email when it happens — no noise.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
          placeholder="your@email.com"
          required
          autoComplete="email"
          aria-label="Email for fee alerts"
          disabled={status === "sending"}
          className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
        >
          {status === "sending" ? "Saving…" : "Alert me"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}

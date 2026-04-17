"use client";

import { useState } from "react";

/**
 * Reusable newsletter signup card.
 *
 * Drop into the footer, article sidebars, blog index, etc.
 * Posts to /api/newsletter/subscribe and shows a success/error
 * state without a page reload.
 *
 * Props:
 *   heading   — card headline
 *   body      — supporting copy
 *   source    — passed to the API so we can attribute signups
 *   variant   — 'full' (block) or 'compact' (inline row)
 */

interface Props {
  heading?: string;
  body?: string;
  source?: string;
  variant?: "full" | "compact";
  className?: string;
}

export default function NewsletterSignup({
  heading = "Fee changes, new tools, broker deals",
  body = "A short roundup in your inbox — weekly. No spam, unsubscribe any time.",
  source = "newsletter",
  variant = "full",
  className = "",
}: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [preference, setPreference] = useState<"weekly" | "monthly">("weekly");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, preference, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  if (variant === "compact") {
    // Success takes over the whole form slot so the message is
    // unmissable — just changing the button label ("✓ Signed up") was
    // too subtle, especially on mobile where the button is small and
    // users often focus elsewhere after tapping.
    if (status === "done") {
      return (
        <div
          role="status"
          aria-live="polite"
          className={`px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 ${className}`}
        >
          ✓ Thanks — check your inbox to confirm.
        </div>
      );
    }

    return (
      <form
        onSubmit={submit}
        className={`flex gap-2 items-center ${className}`}
        aria-label="Newsletter signup"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
        >
          {status === "sending" ? "…" : "Subscribe"}
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-700 ml-2">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}
      aria-labelledby="newsletter-heading"
    >
      <h3 id="newsletter-heading" className="text-base font-extrabold text-slate-900 mb-1">
        {heading}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{body}</p>
      {status === "done" ? (
        <div
          role="status"
          className="px-3 py-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800"
        >
          ✓ You&apos;re subscribed. We&apos;ll send the first edition
          within a week.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name (optional)"
              autoComplete="given-name"
              className="px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="cadence"
                checked={preference === "weekly"}
                onChange={() => setPreference("weekly")}
              />
              Weekly
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="cadence"
                checked={preference === "monthly"}
                onChange={() => setPreference("monthly")}
              />
              Monthly
            </label>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full py-2 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Subscribe"}
          </button>
          <p className="text-[0.6rem] text-slate-500">
            No spam. Unsubscribe any time.
          </p>
        </form>
      )}
    </section>
  );
}

"use client";

/**
 * CareersNotifyForm — demand-probe email capture for /careers.
 *
 * Fires PostHog events on:
 *   careers_notify_submitted — user submitted "notify me" form
 *   careers_notify_success   — server accepted the submission
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/posthog/events";

interface FormState {
  email: string;
  name: string;
}

export default function CareersNotifyForm() {
  const [form, setForm] = useState<FormState>({ email: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fire a page-view demand signal once on mount
  useEffect(() => {
    trackEvent("careers_page_viewed", {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    trackEvent("careers_notify_submitted", { has_name: form.name.trim().length > 0 });

    try {
      const res = await fetch("/api/careers/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name.trim() || undefined,
        }),
      });

      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data !== null &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as Record<string, unknown>).error === "string"
            ? (data as { error: string }).error
            : "Something went wrong. Please try again.";
        setError(msg);
        return;
      }

      trackEvent("careers_notify_success", {});
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800"
      >
        <p className="font-bold mb-1">You&apos;re on the list!</p>
        <p>
          We&apos;ll email you as soon as the first roles go live. In the
          meantime,{" "}
          <Link
            href="/advisor-jobs"
            className="text-emerald-700 hover:underline font-medium"
          >
            browse existing advisor jobs
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="your@email.com"
          autoComplete="email"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Email address"
        />
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="First name (optional)"
          autoComplete="given-name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="First name (optional)"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !form.email.trim()}
        className="w-full sm:w-auto px-5 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Sending…" : "Notify me when live"}
      </button>
      <p className="text-[0.65rem] text-slate-400">
        No spam. Unsubscribe any time. We use your email only to notify you
        about careers on invest.com.au.
      </p>
    </form>
  );
}

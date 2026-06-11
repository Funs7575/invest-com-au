"use client";

/**
 * FirmCareersInterestForm — demand probe for /firm-portal/careers.
 *
 * On submit: POSTs to /api/firm-portal/careers/interest.
 * Fires PostHog event firm_careers_interest_submitted on success.
 */

import { useState } from "react";
import { trackEvent } from "@/lib/posthog/events";

interface Props {
  firmId: string;
}

export default function FirmCareersInterestForm({ firmId }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/firm-portal/careers/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
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

      trackEvent("firm_careers_interest_submitted", { firm_id: firmId });
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
        <p className="font-bold mb-1">Got it — thank you!</p>
        <p>
          We&apos;ve recorded your firm&apos;s interest. We&apos;ll reach out
          when recruiting tools are ready. In the meantime, you can{" "}
          <a
            href="/firm-portal/jobs"
            className="text-emerald-700 hover:underline font-medium"
          >
            post a job manually
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="firm-careers-message"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          What roles do you plan to hire for? (optional)
        </label>
        <textarea
          id="firm-careers-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. 2 × senior financial planners, 1 × paraplanner"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          aria-describedby="firm-careers-message-hint"
        />
        <p
          id="firm-careers-message-hint"
          className="text-[0.65rem] text-slate-400 mt-1"
        >
          {message.length}/1000 characters. Leave blank to just register
          interest.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Sending…" : "Register our interest"}
      </button>
    </form>
  );
}

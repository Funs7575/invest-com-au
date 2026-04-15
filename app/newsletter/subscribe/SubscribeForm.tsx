"use client";

import { useState } from "react";
import type { NewsletterSegmentRow } from "@/lib/newsletter";

interface Props {
  segments: NewsletterSegmentRow[];
}

export default function SubscribeForm({ segments }: Props) {
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState(segments[0]?.slug ?? "weekly");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/newsletter-segments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), segment }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(friendlyError(typeof json.error === "string" ? json.error : ""));
        return;
      }
      setStatus("ok");
      setMessage(
        json.already_confirmed
          ? "You're already subscribed — thanks for sticking with us."
          : json.message || "Almost there! Check your inbox to confirm.",
      );
    } catch {
      setStatus("error");
      setError("Network error — please try again.");
    }
  };

  if (status === "ok") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
      >
        <p className="text-sm md:text-base font-bold text-emerald-900 mb-1">
          {message}
        </p>
        <p className="text-xs md:text-sm text-emerald-800">
          The confirmation link lives in your inbox for 24 hours. If you
          don&apos;t see it, check your spam folder or{" "}
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMessage(null);
            }}
            className="underline font-semibold"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <label
          htmlFor="newsletter-email"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
          maxLength={254}
          aria-describedby={error ? "subscribe-error" : undefined}
        />
      </div>

      {segments.length > 1 && (
        <div>
          <label
            htmlFor="newsletter-segment"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Which list?
          </label>
          <select
            id="newsletter-segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm md:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
          >
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.display_name}
                {s.description ? ` — ${s.description}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm md:text-base px-5 py-3 rounded-lg transition-colors shadow-sm"
      >
        {status === "submitting" ? "Subscribing…" : "Subscribe"}
      </button>

      {error && (
        <p
          id="subscribe-error"
          role="alert"
          className="text-xs md:text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
    </form>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case "invalid_email":
      return "That doesn't look like a valid email address.";
    case "Missing email":
      return "Please enter an email address.";
    case "Too many requests":
      return "Too many attempts — please wait a minute and try again.";
    case "":
      return "Something went wrong — please try again.";
    default:
      return "Couldn't subscribe right now — please try again.";
  }
}

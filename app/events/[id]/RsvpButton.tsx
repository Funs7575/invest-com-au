"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  eventId: number;
  isAuthenticated: boolean;
  isRegistered: boolean;
  isFull: boolean;
  isCancelled: boolean;
}

export default function RsvpButton({
  eventId,
  isAuthenticated,
  isRegistered: initialIsRegistered,
  isFull,
  isCancelled,
}: Props) {
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Link
        href={`/auth/login?next=/events/${eventId}`}
        className="inline-flex items-center justify-center w-full px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors text-sm md:text-base"
      >
        Sign in to Register
      </Link>
    );
  }

  if (isCancelled) {
    return (
      <div className="inline-flex items-center justify-center w-full px-6 py-3 bg-slate-100 text-slate-500 font-semibold rounded-xl text-sm md:text-base cursor-not-allowed">
        Event Cancelled
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-50 border border-teal-200 text-teal-700 font-semibold rounded-xl text-sm md:text-base">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        You&apos;re registered
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="inline-flex items-center justify-center w-full px-6 py-3 bg-slate-100 text-slate-500 font-semibold rounded-xl text-sm md:text-base cursor-not-allowed">
        Event is Full
      </div>
    );
  }

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setIsRegistered(true);
      } else {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRegister}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex items-center justify-center w-full px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 active:bg-violet-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
      >
        {loading ? "Registering…" : "Register Now"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}

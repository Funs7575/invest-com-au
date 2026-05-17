"use client";

import { useState } from "react";

interface HubNewsletterCaptureProps {
  /** Must match a slug in the `newsletter_segments` table. */
  segmentSlug: string;
  /** Short name of the hub — used in body copy ("Stay ahead on SMSF"). */
  hubTitle: string;
  /** Optional lead-magnet teaser shown above the email input. */
  leadMagnetTitle?: string;
}

/**
 * Hub-aware newsletter capture block.
 *
 * Posts to /api/newsletter-segments/subscribe with the hub's segment slug
 * so signups route to the correct list in the newsletter system.
 * Renders a success state after submission.
 */
export default function HubNewsletterCapture({
  segmentSlug,
  hubTitle,
  leadMagnetTitle,
}: HubNewsletterCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter-segments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), segment: segmentSlug }),
      });
      if (res.ok) {
        setStatus("success");
      } else if (res.status === 429) {
        setErrorMsg("Too many requests — please try again later.");
        setStatus("error");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error — please check your connection.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="py-12 bg-emerald-50 border-t border-b border-emerald-100">
        <div className="container-custom max-w-2xl text-center">
          <div className="text-3xl mb-3" aria-hidden>✅</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Check your inbox
          </h2>
          <p className="text-slate-600 text-sm">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your {hubTitle} updates.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-slate-50 border-t border-b border-slate-200">
      <div className="container-custom max-w-2xl">
        <div className="text-center mb-6">
          {leadMagnetTitle ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                Free resource
              </p>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {leadMagnetTitle}
              </h2>
              <p className="text-slate-500 text-sm">
                Plus {hubTitle} updates and insights, straight to your inbox.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Stay ahead on {hubTitle}
              </h2>
              <p className="text-slate-500 text-sm">
                Get curated insights, rate changes, and regulatory updates delivered to your inbox.
              </p>
            </>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-label="Email address"
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>

        {status === "error" && (
          <p className="text-center text-sm text-red-600 mt-3" role="alert">
            {errorMsg}
          </p>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-4">
          No spam. Unsubscribe any time. By subscribing you agree to our{" "}
          <a href="/privacy" className="underline hover:text-slate-600">
            Privacy Policy
          </a>.
        </p>
      </div>
    </section>
  );
}

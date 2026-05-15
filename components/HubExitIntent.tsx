"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const MIN_ENGAGEMENT_MS = 20_000; // 20 s on hub before popup can fire
const SHOWN_KEY = "exitIntentShown"; // shared with ExitIntentPopup to avoid double-fire

/**
 * <HubExitIntent> — hub-specific exit-intent email capture.
 *
 * Fires when the user's cursor leaves through the top of the viewport
 * after ≥20 s of engagement on a hub page. Subscribes to the hub's
 * newsletter segment via POST /api/newsletter-segments/subscribe so
 * the lead flows into the hub-specific drip sequence (EM stream).
 *
 * Uses the same `exitIntentShown` sessionStorage key as <ExitIntentPopup>
 * so they never double-fire in the same session.
 *
 * LX-05 — UX conversion stream (REMEDIATION_QUEUE.md).
 */

interface HubExitIntentProps {
  /** Newsletter segment slug seeded by EM-03 migration (e.g. "smsf-hub"). */
  segmentSlug: string;
  /** Display name shown in the modal headline (e.g. "SMSF"). */
  hubName: string;
}

export default function HubExitIntent({ segmentSlug, hubName }: HubExitIntentProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pageLoadTime = useRef(Date.now());

  const isEngaged = useCallback(() => Date.now() - pageLoadTime.current >= MIN_ENGAGEMENT_MS, []);

  const maybeShow = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SHOWN_KEY) === "true") return;
    } catch {
      return;
    }
    if (!isEngaged()) return;
    setVisible(true);
    try {
      sessionStorage.setItem(SHOWN_KEY, "true");
    } catch {
      // ignore
    }
  }, [isEngaged]);

  useEffect(() => {
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) maybeShow();
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [maybeShow]);

  const dismiss = useCallback(() => setVisible(false), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/newsletter-segments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), segment: segmentSlug }),
      });
      if (res.status === 429) {
        setStatus("error");
        setErrorMsg("Too many attempts. Please try again later.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-exit-intent-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        role="presentation"
        onClick={dismiss}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-4 text-slate-400 hover:text-slate-700 text-xl leading-none"
        >
          ×
        </button>

        {status === "success" ? (
          <div className="py-4">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">You&apos;re in!</h2>
            <p className="text-sm text-slate-500">
              Check your inbox for a confirmation link. We&apos;ll send you the best {hubName} guides and updates.
            </p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-3">📬</div>
            <h2 id="hub-exit-intent-title" className="text-lg font-bold text-slate-900 mb-1">
              Get the free {hubName} guide
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Our best {hubName} articles, tools, and advisor tips — delivered to your inbox.
              No spam. Unsubscribe any time.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                aria-label="Email address"
              />
              {errorMsg && (
                <p role="alert" className="text-xs text-red-600">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-emerald-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {status === "loading" ? "Subscribing…" : `Get the ${hubName} Guide →`}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 mt-3">
              By subscribing you agree to our{" "}
              <a href="/privacy" className="underline hover:text-slate-600">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

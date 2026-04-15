"use client";

import { useEffect, useState, useCallback } from "react";
import { recordFormEvent, getOrCreateSessionId } from "@/lib/form-tracking";

/**
 * Exit-intent modal.
 *
 * Fires when the user's cursor leaves through the top of the
 * viewport (classic "about to close the tab" signal) OR on the
 * pagehide / beforeunload events on mobile. Only fires ONCE per
 * session, stored in sessionStorage so a refresh re-enables it.
 *
 * The modal captures an email address and calls /api/email-capture
 * to kick off the abandoned-form recovery drip. Closing the modal
 * counts as a dismissal and never fires again for the same session.
 *
 * Props:
 *   headline:    modal h2 text
 *   subhead:     supporting line below
 *   ctaLabel:    submit button text
 *   source:      value passed to email-capture so we can
 *                distinguish which page triggered it
 *
 * Mount this once in a layout and it picks up exits from every
 * page under it.
 */

interface Props {
  headline?: string;
  subhead?: string;
  ctaLabel?: string;
  source?: string;
}

const DISMISSED_KEY = "exit_intent_dismissed";

export default function ExitIntentModal({
  headline = "Wait — before you go",
  subhead = "Get a personalised broker shortlist based on your goals. Free. No spam.",
  ctaLabel = "Send me the shortlist",
  source = "exit-intent",
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Open handler — triggered on mouseleave top OR pagehide
  const trigger = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // ignore
    }
    setOpen(true);
    recordFormEvent({ form: "lead_form", step: "exit_intent_shown", event: "view" });
  }, []);

  const dismiss = useCallback(
    (reason: "close" | "submit") => {
      setOpen(false);
      try {
        window.sessionStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // ignore
      }
      if (reason === "close") {
        recordFormEvent({ form: "lead_form", step: "exit_intent_dismissed", event: "abandon" });
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Desktop — cursor leaves through the top
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) trigger();
    }
    // Mobile — pagehide / beforeunload (best effort)
    function onHide() {
      trigger();
    }

    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("pagehide", onHide);
    };
  }, [trigger]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          topic: "exit_intent_shortlist",
          source,
          session_id: getOrCreateSessionId(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("done");
      recordFormEvent({
        form: "lead_form",
        step: "exit_intent_submit",
        event: "complete",
      });
      setTimeout(() => dismiss("submit"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-heading"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={() => dismiss("close")}
          aria-label="Close"
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-2xl leading-none"
        >
          ×
        </button>
        <h2 id="exit-intent-heading" className="text-xl font-extrabold text-slate-900 mb-2">
          {headline}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{subhead}</p>

        {status === "done" ? (
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 text-center">
            ✓ Check your inbox — we&apos;ll be in touch shortly.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
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
              {status === "sending" ? "Sending…" : ctaLabel}
            </button>
            <p className="text-[0.6rem] text-slate-500 text-center">
              No spam. Unsubscribe any time.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { getOrCreateSessionId } from "@/lib/form-tracking";

/**
 * Embedded NPS/CSAT prompt.
 *
 * Renders a 0-10 scale + comment field. Only shows once per
 * (trigger, session) combination — stored in sessionStorage so
 * it can re-appear after reload for the same trigger type. After
 * submit or dismiss, the component hides for the rest of the
 * session.
 *
 * Props:
 *   trigger           — 'post_purchase' | 'post_lead' | 'monthly' | 'exit_intent'
 *   respondentType    — 'user' | 'advisor' | 'broker'
 *   respondentId      — optional email or id for follow-up
 *   question          — override the default headline
 *
 * Note: for post-purchase/post-lead flows mount this on the
 * "thank you" screen. For monthly / annual prompts use server
 * logic to decide when to show (e.g. only render after the user's
 * N-th login), not a blanket mount.
 */

type Trigger = "post_purchase" | "post_lead" | "monthly" | "exit_intent";
type Respondent = "user" | "advisor" | "broker";

interface Props {
  trigger: Trigger;
  respondentType: Respondent;
  respondentId?: string | null;
  question?: string;
  className?: string;
}

export default function NPSPrompt({
  trigger,
  respondentType,
  respondentId,
  question = "How likely are you to recommend invest.com.au to a friend or colleague?",
  className = "",
}: Props) {
  const dismissKey = `nps_${trigger}`;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(dismissKey) !== "1";
    } catch {
      return true;
    }
  });
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    }
  }, [dismissKey]);

  const submit = useCallback(async () => {
    if (score == null) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondent_type: respondentType,
          respondent_id: respondentId || null,
          trigger,
          score,
          comment: comment.trim() || null,
          session_id: getOrCreateSessionId(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("sent");
      setTimeout(dismiss, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }, [score, comment, trigger, respondentType, respondentId, dismiss]);

  if (!open) return null;

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm ${className}`}
      role="region"
      aria-labelledby="nps-heading"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 id="nps-heading" className="text-sm font-bold text-slate-900">
          Quick feedback
        </h3>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss feedback prompt"
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {status === "sent" ? (
        <div role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ✓ Thanks — we really appreciate the feedback.
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-700 mb-3">{question}</p>
          <div className="flex items-center justify-between gap-1 mb-3" role="radiogroup" aria-label="0 to 10 scale">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={score === i}
                onClick={() => setScore(i)}
                className={`flex-1 py-2 rounded text-xs font-semibold border transition-colors ${
                  score === i
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[0.6rem] text-slate-500 mb-3">
            <span>Not at all likely</span>
            <span>Extremely likely</span>
          </div>

          {score != null && (
            <>
              <label htmlFor="nps-comment" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Anything else? (optional)
              </label>
              <textarea
                id="nps-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              />
              {error && (
                <p role="alert" className="text-xs text-red-700 mt-2">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={status === "sending"}
                className="mt-3 w-full py-2 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

"use client";

/**
 * MatchAlertCapture — Showcase G9 "tell me when my match changes".
 *
 * Inline email capture on the result screen. POSTs to
 * /api/get-matched/alerts (rides the existing fee-alert subscription infra,
 * source-tagged) with the current top-match platform slugs. Honest copy:
 * "We'll email you if your top match changes. Unsubscribe any time."
 *
 * Fires `match_alert_subscribed { match_count }` on success.
 */

import { useState } from "react";

import Icon from "@/components/Icon";
import { trackEvent as phTrack } from "@/lib/posthog/events";

export default function MatchAlertCapture({
  matchSlugs,
  shareToken,
}: {
  matchSlugs: string[];
  shareToken: string | null;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/get-matched/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          match_slugs: matchSlugs.slice(0, 10),
          share_token: shareToken ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not subscribe.");
      }
      phTrack("match_alert_subscribed", { match_count: matchSlugs.length });
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe.");
      setStatus("idle");
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
      <p className="font-semibold text-slate-900 mb-1">
        Tell me when my match changes
      </p>
      <p className="text-xs text-slate-500 mb-4">
        We&apos;ll email you if your top match changes. Unsubscribe any time.
      </p>
      {status === "done" ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          You&apos;re subscribed. Check your inbox to confirm.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@example.com"
            aria-label="Email address for match-change alerts"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
          <button
            type="button"
            onClick={() => void handleSubscribe()}
            disabled={status === "saving"}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg min-h-11"
          >
            {status === "saving" ? "Saving…" : "Notify me"}
            <Icon name="bell" size={14} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}

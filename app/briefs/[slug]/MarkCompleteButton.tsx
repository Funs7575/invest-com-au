"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  /** Verified owner email — the route authenticates email-as-key. */
  contactEmail: string;
}

/**
 * Consumer "mark engagement complete" → opens the outcome review immediately
 * (AJ-6) rather than waiting for the 28-day cron. On success we send them
 * straight to the review form.
 */
export default function MarkCompleteButton({ slug, contactEmail }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onComplete(): Promise<void> {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/briefs/${slug}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: contactEmail }),
      });
      const json = (await res.json()) as { success?: boolean; review_token?: string; error?: string };
      if (!res.ok || !json.success || !json.review_token) {
        throw new Error(json.error ?? "Could not mark this complete.");
      }
      router.push(`/review/${json.review_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark this complete.");
      setBusy(false);
    }
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
      <div className="text-2xl leading-none">✅</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-violet-900">Wrapped up with your provider?</p>
        <p className="text-xs text-violet-800 mt-1">
          Mark the engagement complete to leave a quick review — it helps other investors and
          bumps your provider on their scoreboard.
        </p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-block mt-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-2"
          >
            Mark complete &amp; review →
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onComplete}
              disabled={busy}
              className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2"
            >
              {busy ? "Opening review…" : "Yes, leave a review"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="text-xs text-violet-700 hover:underline px-2 py-2"
              disabled={busy}
            >
              Not yet
            </button>
          </div>
        )}
        {error && (
          <p className="text-xs text-red-600 mt-2" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

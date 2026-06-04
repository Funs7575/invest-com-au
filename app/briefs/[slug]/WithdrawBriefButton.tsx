"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Brief slug — used to call POST /api/briefs/[slug]/withdraw. */
  slug: string;
  /** The verified owner email (the route authenticates email-as-key). */
  contactEmail: string;
}

/**
 * Consumer-side "Withdraw request" control for an open brief (AJ-3).
 *
 * The withdraw route (`/api/briefs/[slug]/withdraw`) authenticates by
 * matching the brief's `contact_email`, so we pass the same `?email=` the
 * tracker page was opened with. Rendered only for the verified owner of a
 * brief that isn't already closed/withdrawn; on success we refresh the
 * server component so the status banner updates and this control disappears.
 */
export default function WithdrawBriefButton({ slug, contactEmail }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onWithdraw(): Promise<void> {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/briefs/${slug}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: contactEmail }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Could not withdraw the request.");
      }
      // Re-render the server page: the status banner flips to Closed and this
      // control's render guard hides it.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not withdraw the request.");
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
        No longer need this?
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-rose-600 hover:underline font-semibold"
        >
          Withdraw request
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Withdrawing closes this request — providers can no longer respond and
            you won&apos;t be matched further. You can always start a new request later.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="text-xs text-slate-500 px-3 py-2 hover:underline"
              disabled={busy}
            >
              Keep it open
            </button>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={busy}
              className="rounded-xl bg-rose-600 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50"
            >
              {busy ? "Withdrawing…" : "Yes, withdraw"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

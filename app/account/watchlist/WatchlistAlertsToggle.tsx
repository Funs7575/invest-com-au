"use client";

import { useState } from "react";

interface Props {
  initialOptedIn: boolean;
  hasItems: boolean;
}

export default function WatchlistAlertsToggle({ initialOptedIn, hasItems }: Props) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const target = !optedIn;
    setPending(true);
    setError(null);
    // Optimistic flip — revert on error.
    setOptedIn(target);

    try {
      const res = await fetch("/api/account/watchlist/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts_opted_in: target }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setOptedIn(!target);
      setError("Couldn't save that change. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Weekly email digest</p>
          <p className="text-xs text-slate-500 mt-1">
            {hasItems
              ? "Get one email a week when items on your watchlist have news or updates. We skip the email when there's nothing to report."
              : "Add items to your watchlist below to enable the weekly digest."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optedIn}
          aria-label="Weekly watchlist email digest"
          onClick={toggle}
          disabled={pending || !hasItems}
          className={`shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            optedIn ? "bg-emerald-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              optedIn ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

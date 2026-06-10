"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";

interface Props {
  threadId: number;
  /** Pre-rendered SSR tallies for instant display. */
  initialBull?: number;
  initialBear?: number;
}

interface Tallies {
  thread_id: number;
  bull_count: number;
  bear_count: number;
  total: number;
  user_position: "bull" | "bear" | null;
}

/**
 * Bull / Bear side-vote widget for debate threads.
 *
 * Shows a live split bar and lets authenticated users pick a side.
 * Clicking the same side twice retracts the vote.
 */
export default function DebateSideVote({ threadId, initialBull = 0, initialBear = 0 }: Props) {
  const { user, loading } = useUser();
  const [tallies, setTallies] = useState<Tallies>({
    thread_id: threadId,
    bull_count: initialBull,
    bear_count: initialBear,
    total: initialBull + initialBear,
    user_position: null,
  });
  const [busy, setBusy] = useState(false);

  // Load live tallies + user's existing vote once the user is known.
  useEffect(() => {
    void fetch(`/api/community/debate-vote?thread_id=${threadId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Tallies | null) => {
        if (json) setTallies(json);
      })
      .catch(() => {/* ignore */});
  }, [threadId, user?.id]);

  const vote = async (position: "bull" | "bear") => {
    if (busy || !user) return;
    setBusy(true);

    // Optimistic update
    const prev = { ...tallies };
    setTallies((t) => {
      const removing = t.user_position === position;
      const switching = t.user_position !== null && t.user_position !== position;
      return {
        ...t,
        bull_count:
          position === "bull"
            ? removing
              ? t.bull_count - 1
              : t.bull_count + 1
            : switching
              ? t.bull_count - 1
              : t.bull_count,
        bear_count:
          position === "bear"
            ? removing
              ? t.bear_count - 1
              : t.bear_count + 1
            : switching
              ? t.bear_count - 1
              : t.bear_count,
        total: removing ? t.total - 1 : switching ? t.total : t.total + 1,
        user_position: removing ? null : position,
      };
    });

    try {
      const res = await fetch("/api/community/debate-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, position }),
      });
      if (res.ok) {
        const json = (await res.json()) as Tallies;
        setTallies(json);
      } else {
        setTallies(prev);
      }
    } catch {
      setTallies(prev);
    } finally {
      setBusy(false);
    }
  };

  const { bull_count, bear_count, total, user_position } = tallies;
  const bullPct = total > 0 ? Math.round((bull_count / total) * 100) : 50;
  const bearPct = 100 - bullPct;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Community side-poll</h3>

      {/* Split bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-slate-100 mb-4" aria-hidden>
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${bullPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-red-400 rounded-full transition-all duration-500"
          style={{ width: `${bearPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-5">
        <span className="font-medium text-emerald-700">{bullPct}% Bull</span>
        <span className="text-slate-500">{total} {total === 1 ? "vote" : "votes"}</span>
        <span className="font-medium text-red-500">{bearPct}% Bear</span>
      </div>

      {/* Vote buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { void vote("bull"); }}
          disabled={busy || loading || !user}
          aria-pressed={user_position === "bull"}
          className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${
            user_position === "bull"
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
          }`}
        >
          <span className="text-xl" aria-hidden>📈</span>
          <span>Bull</span>
          <span className="text-xs opacity-80">{bull_count}</span>
        </button>

        <button
          type="button"
          onClick={() => { void vote("bear"); }}
          disabled={busy || loading || !user}
          aria-pressed={user_position === "bear"}
          className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${
            user_position === "bear"
              ? "bg-red-500 border-red-500 text-white"
              : "bg-white border-slate-200 text-slate-700 hover:border-red-400 hover:text-red-500"
          }`}
        >
          <span className="text-xl" aria-hidden>📉</span>
          <span>Bear</span>
          <span className="text-xs opacity-80">{bear_count}</span>
        </button>
      </div>

      {!loading && !user && (
        <p className="text-xs text-slate-500 text-center mt-3">
          <Link
            href="/auth/login?next=/community"
            className="text-violet-700 hover:underline"
          >
            Sign in
          </Link>{" "}
          to cast your vote
        </p>
      )}
    </div>
  );
}

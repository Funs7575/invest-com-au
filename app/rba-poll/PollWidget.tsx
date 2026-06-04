"use client";

import { useState } from "react";

export type VoteValue = 1 | 0 | -1;

interface Tally {
  hike: number;
  hold: number;
  cut: number;
  total: number;
}

interface Poll {
  id: number;
  meeting_date: string;
  description: string;
  status: string;
  outcome: VoteValue | null;
  change_bps: number | null;
  tally: Tally;
  myVote: VoteValue | null;
}

interface Props {
  poll: Poll;
  isAuthenticated: boolean;
}

const CHOICES: { value: VoteValue; label: string; emoji: string; activeClass: string }[] = [
  { value: 1, label: "Hike", emoji: "📈", activeClass: "bg-orange-500 border-orange-500 text-white" },
  { value: 0, label: "Hold", emoji: "⏸️", activeClass: "bg-slate-600 border-slate-600 text-white" },
  { value: -1, label: "Cut", emoji: "📉", activeClass: "bg-teal-600 border-teal-600 text-white" },
];

const OUTCOME_LABEL: Record<number, string> = {
  1: "Hiked",
  0: "Held",
  [-1]: "Cut",
};

function pct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function BarRow({
  label,
  emoji,
  count,
  total,
  winner,
  myPick,
}: {
  label: string;
  emoji: string;
  count: number;
  total: number;
  winner: boolean;
  myPick: boolean;
}) {
  const p = pct(count, total);
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-right text-sm font-medium text-slate-600 shrink-0">
        {emoji} {label}
      </span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
        <div
          className={`h-5 rounded-full transition-all duration-700 ${winner ? "bg-emerald-500" : "bg-slate-300"}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <span
        className={`w-12 text-sm font-semibold shrink-0 ${winner ? "text-emerald-700" : "text-slate-500"}`}
      >
        {p}%
      </span>
      {myPick && (
        <span className="text-xs font-semibold text-violet-600 shrink-0">you</span>
      )}
    </div>
  );
}

export default function PollWidget({ poll, isAuthenticated }: Props) {
  const [myVote, setMyVote] = useState<VoteValue | null>(poll.myVote);
  const [tally, setTally] = useState<Tally>(poll.tally);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isOpen = poll.status === "open";
  const isRevealed = poll.status === "revealed";

  const handleVote = async (vote: VoteValue) => {
    if (!isAuthenticated) return;
    if (!isOpen) return;
    setBusy(true);
    setErr(null);
    const prev = myVote;

    // Optimistic update.
    setMyVote(vote);
    setTally((t) => {
      const next = { ...t };
      if (prev === 1) next.hike--;
      else if (prev === 0) next.hold--;
      else if (prev === -1) next.cut--;
      if (vote === 1) next.hike++;
      else if (vote === 0) next.hold++;
      else if (vote === -1) next.cut++;
      if (prev === null) next.total++;
      return next;
    });

    try {
      const res = await fetch(`/api/rba-polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (j.error === "poll_closed") {
          setErr("This poll has closed. Reload the page to see the result.");
        } else {
          throw new Error();
        }
        // Roll back optimistic update.
        setMyVote(prev);
        setTally(poll.tally);
      }
    } catch {
      setErr("Could not save your prediction. Try again.");
      setMyVote(prev);
      setTally(poll.tally);
    } finally {
      setBusy(false);
    }
  };

  const meetingLabel = new Date(poll.meeting_date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
            {isOpen ? "Open for predictions" : isRevealed ? "Result revealed" : "Poll closed"}
          </p>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">{meetingLabel} RBA Decision</h2>
          {poll.description && (
            <p className="text-sm text-slate-500 mt-0.5">{poll.description}</p>
          )}
        </div>
        {tally.total > 0 && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-slate-900">{tally.total}</p>
            <p className="text-xs text-slate-500">predictions</p>
          </div>
        )}
      </div>

      {/* Revealed outcome banner */}
      {isRevealed && poll.outcome != null && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🏦</span>
          <div>
            <p className="font-semibold text-emerald-800">
              RBA {OUTCOME_LABEL[poll.outcome] ?? "—"}
              {poll.change_bps != null && poll.change_bps !== 0
                ? ` ${Math.abs(poll.change_bps)}bps`
                : " (no change)"}
            </p>
            {myVote != null && (
              <p className="text-sm text-emerald-700">
                {myVote === poll.outcome ? "✅ You called it!" : "❌ Better luck next time"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Vote buttons — only show for open polls */}
      {isOpen && (
        <div className="flex gap-2 mb-5">
          {CHOICES.map((c) => {
            const active = myVote === c.value;
            return (
              <button
                key={c.value}
                disabled={busy || !isAuthenticated}
                onClick={() => { void handleVote(c.value); }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                  ${active ? c.activeClass : "border-slate-200 text-slate-600 hover:border-slate-400 bg-white"}
                  disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-pressed={active}
              >
                <span className="text-xl" aria-hidden>{c.emoji}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {!isAuthenticated && isOpen && (
        <p className="text-sm text-slate-500 mb-4 text-center">
          <a href="/auth/login" className="text-violet-600 font-semibold hover:underline">
            Sign in
          </a>{" "}
          to predict the RBA decision.
        </p>
      )}

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {/* Distribution bars */}
      {tally.total > 0 && (
        <div className="space-y-2">
          {CHOICES.map((c) => {
            const count = c.value === 1 ? tally.hike : c.value === 0 ? tally.hold : tally.cut;
            const winner = isRevealed && poll.outcome === c.value;
            const myPick = myVote === c.value;
            return (
              <BarRow
                key={c.value}
                label={c.label}
                emoji={c.emoji}
                count={count}
                total={tally.total}
                winner={winner}
                myPick={myPick}
              />
            );
          })}
          <p className="text-xs text-slate-400 pt-1">
            {tally.total} {tally.total === 1 ? "prediction" : "predictions"} cast
          </p>
        </div>
      )}

      {tally.total === 0 && isOpen && (
        <p className="text-sm text-slate-400 text-center py-2">Be the first to predict!</p>
      )}
    </div>
  );
}

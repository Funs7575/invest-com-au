import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import PollWidget from "./PollWidget";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RBA Rate Prediction — Invest.com.au",
  description:
    "Predict the Reserve Bank of Australia's next cash rate decision and track your accuracy on the leaderboard.",
  openGraph: {
    title: "RBA Rate Prediction — Invest.com.au",
    description: "Will the RBA hike, hold, or cut? Cast your prediction and see how the community calls it.",
  },
};

interface PollRow {
  id: number;
  meeting_date: string;
  description: string;
  status: string;
  outcome: number | null;
  change_bps: number | null;
  decided_at: string | null;
}

interface VoteRow {
  target_id: number;
  vote: number;
  voter_user_id: string;
}

interface LeaderboardRow {
  rank: number;
  display_name: string;
  badge: string;
  polls_participated: number;
  correct_predictions: number;
  accuracy_pct: number;
}

function tallyVotes(votes: VoteRow[], pollId: number) {
  const subset = votes.filter((v) => v.target_id === pollId);
  const t = { hike: 0, hold: 0, cut: 0, total: 0 };
  for (const v of subset) {
    t.total++;
    if (v.vote === 1) t.hike++;
    else if (v.vote === 0) t.hold++;
    else if (v.vote === -1) t.cut++;
  }
  return t;
}

export default async function RbaPollPage() {
  // Single server client — carries user cookies for auth, reads public-readable tables via anon/auth policies.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Fetch polls — public-readable (rba_polls_public_read policy covers anon + authenticated).
  const { data: pollRows } = await supabase
    .from("rba_polls")
    .select("id, meeting_date, description, status, outcome, change_bps, decided_at")
    .order("meeting_date", { ascending: false })
    .limit(10);

  const polls = (pollRows ?? []) as PollRow[];
  const pollIds = polls.map((p) => p.id);

  // Fetch all votes for these polls — forum_votes_public_read covers this.
  const { data: voteRows } = await supabase
    .from("forum_votes")
    .select("target_id, vote, voter_user_id")
    .eq("target_type", "rba_poll")
    .in("target_id", pollIds.length > 0 ? pollIds : [-1]);

  const votes = (voteRows ?? []) as VoteRow[];

  // Fetch leaderboard from the rba_poll_accuracy view.
  interface AccRow {
    voter_user_id: string;
    polls_participated: number;
    correct_predictions: number;
    accuracy_pct: number;
  }
  interface ProfileRow {
    user_id: string;
    display_name: string;
    badge: string;
  }

  const { data: accRows } = await supabase
    .from("rba_poll_accuracy")
    .select("voter_user_id, polls_participated, correct_predictions, accuracy_pct")
    .gte("polls_participated", 2)
    .order("accuracy_pct", { ascending: false })
    .order("correct_predictions", { ascending: false })
    .limit(10);

  const accuracy = (accRows ?? []) as AccRow[];
  const leaderboardUserIds = accuracy.map((r) => r.voter_user_id);
  const { data: profileRows } = leaderboardUserIds.length > 0
    ? await supabase
        .from("forum_user_profiles")
        .select("user_id, display_name, badge")
        .in("user_id", leaderboardUserIds)
    : { data: [] };

  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profileRows ?? []) as ProfileRow[]) {
    profileMap.set(p.user_id, p);
  }

  const leaderboard: LeaderboardRow[] = accuracy.map((row, i) => {
    const profile = profileMap.get(row.voter_user_id);
    return {
      rank: i + 1,
      display_name: profile?.display_name ?? "Anonymous",
      badge: profile?.badge ?? "",
      polls_participated: row.polls_participated,
      correct_predictions: row.correct_predictions,
      accuracy_pct: Number(row.accuracy_pct),
    };
  });

  // Enrich polls with tally + myVote for the widget.
  const enriched = polls.map((poll) => ({
    ...poll,
    outcome: (poll.outcome as 1 | 0 | -1 | null),
    tally: tallyVotes(votes, poll.id),
    myVote: userId
      ? ((votes.find((v) => v.target_id === poll.id && v.voter_user_id === userId)?.vote ??
          null) as 1 | 0 | -1 | null)
      : null,
  }));

  const openPoll = enriched.find((p) => p.status === "open");
  const pastPolls = enriched.filter((p) => p.status === "revealed" || p.status === "closed");

  const OUTCOME_LABEL: Record<number, string> = { 1: "Hiked", 0: "Held", [-1]: "Cut" };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">RBA Rate Prediction</h1>
        <p className="text-slate-600 mt-2">
          Predict the Reserve Bank of Australia&apos;s next cash rate decision. See how the
          community calls it, then check your accuracy on the leaderboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main poll column */}
        <div className="lg:col-span-2 space-y-5">
          {openPoll ? (
            <PollWidget poll={openPoll} isAuthenticated={userId !== null} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
              <p className="text-3xl mb-2" aria-hidden>⏳</p>
              <p className="font-medium">No open poll right now</p>
              <p className="text-sm mt-1">Check back before the next RBA meeting.</p>
            </div>
          )}

          {/* Past polls */}
          {pastPolls.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-700 mb-3">Past predictions</h2>
              <div className="space-y-3">
                {pastPolls.map((poll) => {
                  const meetLabel = new Date(poll.meeting_date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const myVote = poll.myVote;
                  const correct = myVote != null && poll.outcome != null && myVote === poll.outcome;
                  const { hike, hold, cut, total } = poll.tally;
                  return (
                    <div
                      key={poll.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{meetLabel}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Outcome:{" "}
                          <strong className="text-slate-700">
                            {poll.outcome != null ? OUTCOME_LABEL[poll.outcome] : "—"}
                            {poll.change_bps != null && poll.change_bps !== 0
                              ? ` ${Math.abs(poll.change_bps)}bps`
                              : ""}
                          </strong>
                          {myVote != null && (
                            <span className="ml-2">
                              {correct ? "✅ Correct" : "❌ Incorrect"}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-slate-400 flex gap-3">
                        <span>📈 {Math.round(total > 0 ? (hike / total) * 100 : 0)}%</span>
                        <span>⏸️ {Math.round(total > 0 ? (hold / total) * 100 : 0)}%</span>
                        <span>📉 {Math.round(total > 0 ? (cut / total) * 100 : 0)}%</span>
                        <span className="text-slate-300">({total})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Leaderboard sidebar */}
        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-slate-900 mb-3">🏆 Accuracy leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-slate-400">
                Leaderboard appears after at least 2 revealed polls — and each predictor needs 2+
                entries to qualify.
              </p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((row) => (
                  <li key={row.rank} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-5 text-center font-bold shrink-0 ${
                        row.rank === 1
                          ? "text-amber-500"
                          : row.rank === 2
                            ? "text-slate-400"
                            : row.rank === 3
                              ? "text-amber-700"
                              : "text-slate-400"
                      }`}
                    >
                      {row.rank}
                    </span>
                    <span className="flex-1 truncate font-medium text-slate-800">
                      {row.display_name}
                      {row.badge && (
                        <span className="ml-1 text-xs text-violet-600">{row.badge}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-emerald-700">
                      {row.accuracy_pct.toFixed(0)}%
                    </span>
                    <span className="shrink-0 text-slate-400 text-xs">
                      {row.correct_predictions}/{row.polls_participated}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {!userId && (
              <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">
                <Link href="/account/login" className="text-violet-600 font-semibold hover:underline">
                  Sign in
                </Link>{" "}
                to track your accuracy.
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-8 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        <p className="text-xs text-slate-400 mt-1">
          RBA meeting dates are indicative and subject to change. Community predictions are for
          entertainment and educational purposes only.
        </p>
      </footer>
    </main>
  );
}

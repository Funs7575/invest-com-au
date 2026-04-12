"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";

interface QAPair {
  id: number;
  question: string;
  display_name: string;
  created_at: string;
  vote_count?: number;
  answers: {
    id: number;
    answer: string;
    answered_by: string;
    author_slug?: string;
    display_name?: string;
    is_accepted: boolean;
    created_at: string;
    vote_count?: number;
    helpful_count?: number;
  }[];
}

interface QASectionProps {
  questions: QAPair[];
  brokerSlug: string;
  brokerName: string;
  pageType?: string;
  pageSlug?: string;
}

type VoteState = Record<string, 1 | -1>;

function getStorageKey(brokerSlug: string) {
  return `qa_votes_${brokerSlug}`;
}

function loadVotes(brokerSlug: string): VoteState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getStorageKey(brokerSlug));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVotes(brokerSlug: string, votes: VoteState) {
  try {
    localStorage.setItem(getStorageKey(brokerSlug), JSON.stringify(votes));
  } catch {
    // localStorage unavailable
  }
}

function VoteButtons({
  targetType,
  targetId,
  initialCount,
  userVote,
  onVote,
}: {
  targetType: "question" | "answer";
  targetId: number;
  initialCount: number;
  userVote: 1 | -1 | null;
  onVote: (targetType: "question" | "answer", targetId: number, vote: 1 | -1) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={() => onVote(targetType, targetId, 1)}
        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
          userVote === 1
            ? "bg-blue-100 text-blue-700"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        }`}
        aria-label={`Upvote ${targetType}`}
        title="Upvote"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <span
        className={`text-xs font-semibold tabular-nums ${
          initialCount > 0
            ? "text-blue-700"
            : initialCount < 0
              ? "text-red-500"
              : "text-slate-400"
        }`}
      >
        {initialCount}
      </span>
      <button
        type="button"
        onClick={() => onVote(targetType, targetId, -1)}
        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
          userVote === -1
            ? "bg-red-100 text-red-600"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        }`}
        aria-label={`Downvote ${targetType}`}
        title="Downvote"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export default function QASection({ questions, brokerSlug, brokerName, pageType: _pageType = "broker", pageSlug: _pageSlug }: QASectionProps) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<VoteState>({});
  const [votingInFlight, setVotingInFlight] = useState<Set<string>>(new Set());

  // Initialize vote counts and user votes from localStorage on mount
  useEffect(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      counts[`question:${q.id}`] = q.vote_count ?? 0;
      for (const a of q.answers) {
        counts[`answer:${a.id}`] = a.vote_count ?? 0;
      }
    }
    setVoteCounts(counts);
    setUserVotes(loadVotes(brokerSlug));
  }, [questions, brokerSlug]);

  // Sort questions by vote_count descending (most voted first)
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      const aCount = voteCounts[`question:${a.id}`] ?? a.vote_count ?? 0;
      const bCount = voteCounts[`question:${b.id}`] ?? b.vote_count ?? 0;
      return bCount - aCount;
    });
  }, [questions, voteCounts]);

  const handleVote = useCallback(
    async (targetType: "question" | "answer", targetId: number, vote: 1 | -1) => {
      const key = `${targetType}:${targetId}`;

      // Prevent double-clicks
      if (votingInFlight.has(key)) return;

      // If user already voted the same way, ignore
      if (userVotes[key] === vote) return;

      const previousVote = userVotes[key] ?? null;
      const previousCount = voteCounts[key] ?? 0;

      // Calculate optimistic delta
      let delta = vote;
      if (previousVote) {
        delta = vote - previousVote;
      }
      const optimisticCount = previousCount + delta;

      // Optimistic update
      setVoteCounts((prev) => ({ ...prev, [key]: optimisticCount }));
      const newUserVotes = { ...userVotes, [key]: vote };
      setUserVotes(newUserVotes);
      saveVotes(brokerSlug, newUserVotes);
      setVotingInFlight((prev) => new Set(prev).add(key));

      try {
        const endpoint =
          targetType === "question"
            ? `/api/questions/${targetId}/vote`
            : `/api/answers/${targetId}/vote`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote }),
        });

        if (!res.ok) {
          throw new Error("Vote failed");
        }

        const data = await res.json();
        // Use server-returned count as source of truth
        setVoteCounts((prev) => ({ ...prev, [key]: data.vote_count }));
      } catch {
        // Revert optimistic update on failure
        setVoteCounts((prev) => ({ ...prev, [key]: previousCount }));
        if (previousVote) {
          setUserVotes((prev) => ({ ...prev, [key]: previousVote }));
          saveVotes(brokerSlug, { ...newUserVotes, [key]: previousVote });
        } else {
          setUserVotes((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          const reverted = { ...newUserVotes };
          delete reverted[key];
          saveVotes(brokerSlug, reverted);
        }
      } finally {
        setVotingInFlight((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [userVotes, voteCounts, brokerSlug, votingInFlight]
  );

  if (questions.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        Questions About {brokerName}
      </h2>
      <div className="space-y-4">
        {sortedQuestions.map((q) => {
          // Determine the highest-voted answer for "Most Helpful" badge
          const highestVotedAnswer =
            q.answers.length > 1
              ? q.answers.reduce<(typeof q.answers)[number] | null>((best, a) => {
                  const aVotes = voteCounts[`answer:${a.id}`] ?? a.vote_count ?? 0;
                  if (aVotes <= 0) return best;
                  if (!best) return a;
                  const bestVotes = voteCounts[`answer:${best.id}`] ?? best.vote_count ?? 0;
                  return aVotes > bestVotes ? a : best;
                }, null)
              : null;

          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <VoteButtons
                  targetType="question"
                  targetId={q.id}
                  initialCount={voteCounts[`question:${q.id}`] ?? q.vote_count ?? 0}
                  userVote={userVotes[`question:${q.id}`] ?? null}
                  onVote={handleVote}
                />
                <span className="shrink-0 w-6 h-6 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                  Q
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{q.question}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Asked by {q.display_name} &middot;{" "}
                    {new Date(q.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              {q.answers.length > 0 && (
                <div className="mt-3 ml-9 space-y-3">
                  {q.answers.map((a) => {
                    const isMostHelpful = highestVotedAnswer?.id === a.id;
                    return (
                      <div key={a.id} className="border-l-2 border-slate-200 pl-3">
                        <div className="flex items-start gap-3">
                          <VoteButtons
                            targetType="answer"
                            targetId={a.id}
                            initialCount={voteCounts[`answer:${a.id}`] ?? a.vote_count ?? 0}
                            userVote={userVotes[`answer:${a.id}`] ?? null}
                            onVote={handleVote}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                                {a.answered_by === "editorial" ? "Editorial" : "Community"}
                              </span>
                              {a.is_accepted && (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  Accepted
                                </span>
                              )}
                              {isMostHelpful && (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                  Most Helpful
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{a.answer}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {a.author_slug ? (
                                <Link
                                  href={`/authors/${a.author_slug}`}
                                  className="hover:text-slate-600 underline"
                                >
                                  {a.display_name || "Editorial Team"}
                                </Link>
                              ) : (
                                a.display_name || "Editorial Team"
                              )}
                              {" \u00B7 "}
                              {new Date(a.created_at).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

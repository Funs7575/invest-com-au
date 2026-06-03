"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Question {
  id: number;
  session_id: number;
  display_name: string;
  question: string;
  is_anonymous: boolean;
  answer: string | null;
  answered_at: string | null;
  upvote_count: number;
  created_at: string;
  userUpvoted?: boolean;
}

interface Props {
  sessionId: number;
  sessionStatus: "upcoming" | "live" | "ended" | "transcript" | "draft";
  initialQuestions: Question[];
  maxQuestions: number;
  isAdvisor?: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function OfficeHoursLiveStream({
  sessionId,
  sessionStatus,
  initialQuestions,
  maxQuestions,
  isAdvisor = false,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [questionText, setQuestionText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLive = sessionStatus === "live";
  const canAsk = isLive || sessionStatus === "upcoming";

  // ── Auth state ────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`office-hours-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "office_hour_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as Question;
          setQuestions((prev) => {
            if (prev.some((q) => q.id === row.id)) return prev;
            return [...prev, { ...row, userUpvoted: false }];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "office_hour_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as Question;
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === updated.id
                ? { ...q, answer: updated.answer, answered_at: updated.answered_at, upvote_count: updated.upvote_count }
                : q,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, isLive]);

  // ── Submit question ───────────────────────────────────────────────────────
  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!questionText.trim()) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/office-hours/${sessionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText.trim(), is_anonymous: isAnonymous }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError((data as { error?: string }).error ?? "Failed to submit");
        return;
      }

      setQuestionText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch {
      setSubmitError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Upvote ────────────────────────────────────────────────────────────────
  async function toggleUpvote(q: Question) {
    if (!userId || upvoting.has(q.id)) return;

    setUpvoting((s) => new Set(s).add(q.id));
    const wasUpvoted = q.userUpvoted;

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === q.id
          ? {
              ...item,
              userUpvoted: !wasUpvoted,
              upvote_count: item.upvote_count + (wasUpvoted ? -1 : 1),
            }
          : item,
      ),
    );

    try {
      const res = await fetch(`/api/office-hours/${sessionId}/questions/${q.id}/upvote`, {
        method: wasUpvoted ? "DELETE" : "POST",
      });
      if (!res.ok) {
        setQuestions((prev) =>
          prev.map((item) =>
            item.id === q.id
              ? { ...item, userUpvoted: wasUpvoted, upvote_count: item.upvote_count + (wasUpvoted ? 1 : -1) }
              : item,
          ),
        );
      }
    } catch {
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, userUpvoted: wasUpvoted, upvote_count: item.upvote_count + (wasUpvoted ? 1 : -1) }
            : item,
        ),
      );
    } finally {
      setUpvoting((s) => {
        const next = new Set(s);
        next.delete(q.id);
        return next;
      });
    }
  }

  const sorted = [...questions]
    .filter((q) => !isAdvisor || !q.is_anonymous || q.userUpvoted !== undefined)
    .sort((a, b) => b.upvote_count - a.upvote_count || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="space-y-6">
      {/* Status bar */}
      {isLive && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold">Session is live — questions are updating in real-time</span>
        </div>
      )}

      {/* Ask form */}
      {canAsk && (
        <form onSubmit={submitQuestion} className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            {isLive ? "Ask a question" : "Submit a question for this session"}
          </label>
          <textarea
            ref={textareaRef}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="What would you like to ask the advisor? (5–500 characters)"
            maxLength={500}
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-between mt-2 gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              Ask anonymously
            </label>
            <div className="flex items-center gap-3">
              {submitError && (
                <span className="text-xs text-red-600">{submitError}</span>
              )}
              <span className="text-xs text-slate-400">{questionText.length}/500</span>
              {!userId ? (
                <a
                  href="/auth/login?next=/questions"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Sign in to ask
                </a>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || questionText.trim().length < 5}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              )}
            </div>
          </div>
          {questions.length >= maxQuestions && (
            <p className="text-xs text-amber-600 mt-2">
              Question limit ({maxQuestions}) reached for this session.
            </p>
          )}
        </form>
      )}

      {/* Questions list */}
      {sorted.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2" aria-hidden>💬</p>
          <p className="text-sm">
            {canAsk ? "No questions yet — be the first to ask!" : "No questions for this session."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((q) => (
            <div
              key={q.id}
              className={`bg-white border rounded-xl p-4 ${q.answer ? "border-emerald-200" : "border-slate-200"}`}
            >
              <div className="flex items-start gap-3">
                {/* Upvote */}
                <button
                  onClick={() => toggleUpvote(q)}
                  disabled={!userId || !isLive || upvoting.has(q.id)}
                  aria-label={q.userUpvoted ? "Remove upvote" : "Upvote this question"}
                  className={`shrink-0 flex flex-col items-center gap-0.5 pt-0.5 disabled:opacity-40 transition-colors ${
                    q.userUpvoted ? "text-indigo-600" : "text-slate-400 hover:text-indigo-500"
                  }`}
                >
                  <svg className="w-4 h-4" fill={q.userUpvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-xs font-bold leading-none">{q.upvote_count}</span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">
                      {q.is_anonymous ? "Anonymous" : q.display_name}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(q.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-800">{q.question}</p>

                  {q.answer && (
                    <div className="mt-3 bg-emerald-50 border-l-2 border-emerald-400 pl-3 py-2 rounded-r-lg">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Advisor answered</p>
                      <p className="text-sm text-slate-800">{q.answer}</p>
                      {q.answered_at && (
                        <p className="text-xs text-slate-400 mt-1">{timeAgo(q.answered_at)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

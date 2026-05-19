"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { logger } from "@/lib/logger";

const log = logger("admin-qa-page");

type Question = {
  id: number;
  slug: string;
  question_text: string;
  category: string;
  email: string | null;
  created_at: string;
};

type ItemState = {
  loading: boolean;
  draft: string | null;
  answerId: number | null;
  done: boolean;
  error: string | null;
};

export default function AdminQaPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<Record<number, ItemState>>({});

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/qa");
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json() as { questions: Question[] };
      setQuestions(json.questions);
      const initial: Record<number, ItemState> = {};
      for (const q of json.questions) {
        initial[q.id] = { loading: false, draft: null, answerId: null, done: false, error: null };
      }
      setStates(initial);
    } catch (err) {
      log.error("load questions failed", { err: String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  function setItemState(id: number, patch: Partial<ItemState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
  }

  async function handleGenerateDraft(q: Question) {
    setItemState(q.id, { loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/qa/${q.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_draft" }),
      });
      const json = await res.json() as { answer_id?: number; answer_text?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? String(res.status));
      setItemState(q.id, { draft: json.answer_text ?? "", answerId: json.answer_id ?? null, loading: false });
    } catch (err) {
      setItemState(q.id, { loading: false, error: String(err) });
    }
  }

  async function handleApprove(q: Question) {
    const state = states[q.id];
    if (!state) return;
    setItemState(q.id, { loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/qa/${q.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          answer_text: state.draft ?? "",
          answer_id: state.answerId ?? undefined,
        }),
      });
      const json = await res.json() as { status?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? String(res.status));
      setItemState(q.id, { loading: false, done: true });
    } catch (err) {
      setItemState(q.id, { loading: false, error: String(err) });
    }
  }

  async function handleReject(q: Question, note?: string) {
    setItemState(q.id, { loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/qa/${q.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", moderation_note: note }),
      });
      const json = await res.json() as { status?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? String(res.status));
      setItemState(q.id, { loading: false, done: true });
    } catch (err) {
      setItemState(q.id, { loading: false, error: String(err) });
    }
  }

  const pending = questions.filter((q) => !states[q.id]?.done);

  return (
    <AdminShell title="Q&A Moderation">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{pending.length} pending question{pending.length !== 1 ? "s" : ""}</p>
        <button
          onClick={loadQuestions}
          className="text-sm text-indigo-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-gray-400 italic">No pending questions.</p>
      ) : (
        <div className="space-y-6">
          {pending.map((q) => {
            const st = states[q.id] ?? { loading: false, draft: null, answerId: null, done: false, error: null };
            return (
              <div key={q.id} className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">{q.question_text}</p>
                  <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {q.category}
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-400">
                  {new Date(q.created_at).toLocaleString("en-AU")}
                  {q.email ? ` · ${q.email}` : ""}
                </p>

                {st.error && (
                  <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-600">{st.error}</p>
                )}

                {st.draft !== null ? (
                  <>
                    <textarea
                      className="mb-3 w-full rounded border border-gray-200 p-2 text-sm"
                      rows={8}
                      value={st.draft}
                      onChange={(e) => setItemState(q.id, { draft: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={st.loading || !st.draft.trim()}
                        onClick={() => handleApprove(q)}
                        className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {st.loading ? "Publishing…" : "Publish"}
                      </button>
                      <button
                        disabled={st.loading}
                        onClick={() => handleReject(q)}
                        className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      disabled={st.loading}
                      onClick={() => handleGenerateDraft(q)}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {st.loading ? "Generating…" : "Generate Draft"}
                    </button>
                    <button
                      disabled={st.loading}
                      onClick={() => handleReject(q)}
                      className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

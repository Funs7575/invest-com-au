"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

type Answer = {
  id: number;
  question_id: number;
  answer: string;
  answered_by: string;
  author_slug: string | null;
  display_name: string | null;
  status: string;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
};

type Question = {
  id: number;
  broker_slug: string;
  page_type: string;
  page_slug: string;
  question: string;
  display_name: string;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  broker_answers?: Answer[];
};

type StatusTab = "all" | "pending" | "approved" | "rejected";

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Answer form state
  const [answerText, setAnswerText] = useState("");
  const [answerLoading, setAnswerLoading] = useState(false);

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("broker_questions")
      .select("*, broker_answers(*)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data) setQuestions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [search, tab]);

  // Stats
  const stats = useMemo(() => {
    const total = questions.length;
    const pending = questions.filter((q) => q.status === "pending").length;
    const approved = questions.filter((q) => q.status === "approved").length;
    const rejected = questions.filter((q) => q.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [questions]);

  // Filtered
  const filtered = useMemo(() => {
    let list = questions;
    if (tab !== "all") {
      list = list.filter((q) => q.status === tab);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.display_name.toLowerCase().includes(s) ||
          (q.email && q.email.toLowerCase().includes(s)) ||
          q.broker_slug.toLowerCase().includes(s) ||
          q.question.toLowerCase().includes(s)
      );
    }
    return list;
  }, [questions, tab, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Moderate action
  async function handleModerate(questionId: number, action: "approve" | "reject") {
    setActionLoading(questionId);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      const { error } = await supabase
        .from("broker_questions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", questionId);

      if (!error) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, status: newStatus as "approved" | "rejected", updated_at: new Date().toISOString() }
              : q
          )
        );
      }
    } catch (err) {
      console.error("Moderate error:", err);
    }
    setActionLoading(null);
  }

  // Submit answer
  async function handleSubmitAnswer(questionId: number) {
    if (!answerText.trim()) return;
    setAnswerLoading(true);
    try {
      const { data, error } = await supabase
        .from("broker_answers")
        .insert({
          question_id: questionId,
          answer: answerText.trim(),
          answered_by: "editorial",
          display_name: "Editorial Team",
          status: "approved",
          is_accepted: true,
        })
        .select()
        .single();

      if (!error && data) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, broker_answers: [...(q.broker_answers || []), data] }
              : q
          )
        );
        setAnswerText("");
      }
    } catch (err) {
      console.error("Answer submit error:", err);
    }
    setAnswerLoading(false);
  }

  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Questions</h1>
        <button
          onClick={load}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} highlight={stats.pending > 0} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Rejected" value={stats.rejected} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-green-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, email, broker, or question..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 mb-4"
      />

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">Loading questions...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Question</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Answers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{q.broker_slug}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{q.display_name}</div>
                    {q.email && <div className="text-xs text-slate-400">{q.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setExpandedId(expandedId === q.id ? null : q.id); setAnswerText(""); }}
                      className="text-sm text-slate-700 hover:text-green-700 text-left max-w-[250px] truncate transition-colors"
                      title={q.question}
                    >
                      {q.question}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {q.broker_answers?.length || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(q.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {q.status === "pending" ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleModerate(q.id, "approve")}
                          disabled={actionLoading === q.id}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(q.id, "reject")}
                          disabled={actionLoading === q.id}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    ) : q.status === "approved" ? (
                      <button
                        onClick={() => handleModerate(q.id, "reject")}
                        disabled={actionLoading === q.id}
                        className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    ) : (
                      <button
                        onClick={() => handleModerate(q.id, "approve")}
                        disabled={actionLoading === q.id}
                        className="px-2 py-1 text-xs bg-green-50 text-green-500 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    {search || tab !== "all" ? "No questions match your filters." : "No questions yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Expanded question detail */}
          {expandedId && (() => {
            const q = questions.find((qn) => qn.id === expandedId);
            if (!q) return null;
            return (
              <div className="border-t border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">Question Detail</h3>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line mb-3">{q.question}</p>
                <div className="text-xs text-slate-400 space-y-1 mb-4">
                  <p>Broker: {q.broker_slug} / Page: {q.page_slug} ({q.page_type})</p>
                  <p>Asked by: {q.display_name}{q.email ? ` (${q.email})` : ""}</p>
                  <p>Submitted: {new Date(q.created_at).toLocaleString("en-AU")}</p>
                  <p>Last updated: {new Date(q.updated_at).toLocaleString("en-AU")}</p>
                </div>

                {/* Existing answers */}
                {q.broker_answers && q.broker_answers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Answers ({q.broker_answers.length})</h4>
                    <div className="space-y-2">
                      {q.broker_answers.map((a) => (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              {a.answered_by}
                            </span>
                            {a.is_accepted && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                                Accepted
                              </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${statusColors[a.status] || "bg-slate-100 text-slate-600"}`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700">{a.answer}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {a.display_name || "Unknown"} · {new Date(a.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add answer form */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Add Editorial Answer</h4>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    rows={3}
                  />
                  <button
                    onClick={() => handleSubmitAnswer(q.id)}
                    disabled={answerLoading || !answerText.trim()}
                    className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                  >
                    {answerLoading ? "Submitting..." : "Submit Answer"}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages} · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-amber-700" : "text-slate-900"}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

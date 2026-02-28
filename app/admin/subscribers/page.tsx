"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { downloadCSV } from "@/lib/csv-export";

type EmailCapture = {
  id: number;
  email: string;
  name: string | null;
  source: string | null;
  captured_at: string;
};

type QuizLead = {
  id: number;
  email: string;
  name: string | null;
  answers: string[];
  top_match_slug: string | null;
  experience_level: string | null;
  investment_range: string | null;
  trading_interest: string | null;
  captured_at: string;
};

const PAGE_SIZE = 20;

export default function AdminSubscribersPage() {
  const [captures, setCaptures] = useState<EmailCapture[]>([]);
  const [quizLeads, setQuizLeads] = useState<QuizLead[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<"all" | "quiz">("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const [{ data: emailData }, { data: leadData }] = await Promise.all([
      supabase.from("email_captures").select("*").order("captured_at", { ascending: false }).limit(1000),
      supabase.from("quiz_leads").select("*").order("captured_at", { ascending: false }).limit(500),
    ]);
    if (emailData) setCaptures(emailData);
    if (leadData) setQuizLeads(leadData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); setSelected(new Set()); }, [search, sourceFilter, tab]);

  // Unique sources for filter dropdown
  const sources = useMemo(() => {
    const s = new Set(captures.map((c) => c.source || "unknown"));
    return Array.from(s).sort();
  }, [captures]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = captures.filter((c) => {
      const d = new Date(c.captured_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const topSourceMap: Record<string, number> = {};
    captures.forEach((c) => {
      const s = c.source || "unknown";
      topSourceMap[s] = (topSourceMap[s] || 0) + 1;
    });
    const topSource = Object.entries(topSourceMap).sort((a, b) => b[1] - a[1])[0];
    return {
      total: captures.length,
      thisMonth: thisMonth.length,
      quizLeads: quizLeads.length,
      topSource: topSource ? `${topSource[0]} (${topSource[1]})` : "—",
    };
  }, [captures, quizLeads]);

  // Filtered email captures
  const filteredCaptures = useMemo(() => {
    let list = captures;
    if (sourceFilter !== "all") {
      list = list.filter((c) => (c.source || "unknown") === sourceFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.email.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)));
    }
    return list;
  }, [captures, sourceFilter, search]);

  // Filtered quiz leads
  const filteredQuizLeads = useMemo(() => {
    if (!search) return quizLeads;
    const q = search.toLowerCase();
    return quizLeads.filter((l) => l.email.toLowerCase().includes(q) || (l.name && l.name.toLowerCase().includes(q)));
  }, [quizLeads, search]);

  const currentList = tab === "all" ? filteredCaptures : filteredQuizLeads;
  const totalPages = Math.ceil(currentList.length / PAGE_SIZE);
  const paginatedList = currentList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginatedList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedList.map((item) => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    const table = tab === "all" ? "email_captures" : "quiz_leads";
    const ids = Array.from(selected);
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (!error) {
      setSelected(new Set());
      load();
    }
    setShowDeleteConfirm(false);
  };

  // CSV export
  const exportCsv = () => {
    const rows = tab === "all"
      ? [["Email", "Name", "Source", "Date"], ...filteredCaptures.map((c) => [c.email, c.name || "", c.source || "", new Date(c.captured_at).toLocaleDateString("en-AU")])]
      : [["Email", "Name", "Top Match", "Experience", "Investment", "Interest", "Date"], ...filteredQuizLeads.map((l) => [l.email, l.name || "", l.top_match_slug || "", l.experience_level || "", l.investment_range || "", l.trading_interest || "", new Date(l.captured_at).toLocaleDateString("en-AU")])];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab === "all" ? "subscribers" : "quiz-leads"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscribers</h1>
          <p className="text-sm text-slate-500 mt-1">Email signups from the site — quiz leads, newsletter subscribers, and article captures.</p>
        </div>
        <button
          onClick={exportCsv}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Export CSV ↓
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Subscribers" value={stats.total} />
        <StatCard label="This Month" value={stats.thisMonth} />
        <StatCard label="Quiz Leads" value={stats.quizLeads} />
        <StatCard label="Top Source" value={stats.topSource} isText />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "all" ? "bg-green-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          All Subscribers ({captures.length})
        </button>
        <button
          onClick={() => setTab("quiz")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "quiz" ? "bg-green-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Quiz Leads ({quizLeads.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        {tab === "all" && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-sm font-medium text-amber-800">{selected.size} selected</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Delete Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">Loading subscribers...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedList.length > 0 && selected.size === paginatedList.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                {tab === "all" ? (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Top Match</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Experience</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Investment</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedList.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50 ${selected.has(item.id) ? "bg-amber-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.name || "—"}</td>
                  {tab === "all" ? (
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                        {(item as EmailCapture).source || "unknown"}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                        {(item as QuizLead).top_match_slug || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                        {(item as QuizLead).experience_level || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">
                        {(item as QuizLead).investment_range || "—"}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(item.captured_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    {search || sourceFilter !== "all" ? "No results match your filters." : "No subscribers yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages} · {currentList.length} result{currentList.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Selected Subscribers"
        message={`Delete ${selected.size} selected subscriber${selected.size !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </AdminShell>
  );
}

function StatCard({ label, value, isText }: { label: string; value: string | number; isText?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`font-bold ${isText ? "text-sm text-slate-700 truncate" : "text-2xl text-slate-900"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

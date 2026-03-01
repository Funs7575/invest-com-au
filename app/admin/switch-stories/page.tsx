"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import { downloadCSV } from "@/lib/csv-export";

type Story = {
  id: number;
  source_broker_id: number;
  source_broker_slug: string;
  dest_broker_id: number;
  dest_broker_slug: string;
  display_name: string;
  email: string;
  title: string;
  body: string;
  reason: string | null;
  source_rating: number;
  dest_rating: number;
  estimated_savings: string | null;
  time_with_source: string | null;
  status: "pending" | "verified" | "approved" | "rejected";
  verification_token: string;
  verified_at: string | null;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
};

type StatusTab = "all" | "pending" | "verified" | "approved" | "rejected";

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  verified: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 24 24"
          fill={s <= rating ? "#f59e0b" : "none"}
          stroke={s <= rating ? "#f59e0b" : "#cbd5e1"}
          strokeWidth={1.5}
          className="w-3.5 h-3.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </span>
  );
}

export default function AdminSwitchStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("switch_stories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data) setStories(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [search, tab]);

  // Stats
  const stats = useMemo(() => {
    const total = stories.length;
    const pending = stories.filter((s) => s.status === "pending").length;
    const verified = stories.filter((s) => s.status === "verified").length;
    const approved = stories.filter((s) => s.status === "approved").length;
    const rejected = stories.filter((s) => s.status === "rejected").length;
    return { total, pending, verified, approved, rejected };
  }, [stories]);

  // Filtered
  const filtered = useMemo(() => {
    let list = stories;
    if (tab !== "all") {
      list = list.filter((s) => s.status === tab);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.display_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.source_broker_slug.toLowerCase().includes(q) ||
          s.dest_broker_slug.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stories, tab, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // CSV Export
  const exportStories = () => {
    downloadCSV(
      `switch-stories-${new Date().toISOString().split("T")[0]}.csv`,
      ["From", "To", "Name", "Email", "Title", "Source Rating", "Dest Rating", "Status", "Date"],
      filtered.map((s) => [
        s.source_broker_slug, s.dest_broker_slug, s.display_name, s.email,
        s.title, String(s.source_rating), String(s.dest_rating), s.status,
        new Date(s.created_at).toLocaleDateString("en-AU"),
      ])
    );
  };

  // Moderate action
  async function handleModerate(storyId: number, action: "approve" | "reject") {
    setActionLoading(storyId);
    try {
      const res = await fetch("/api/switch-story/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyId, action }),
      });
      if (res.ok) {
        setStories((prev) =>
          prev.map((s) =>
            s.id === storyId
              ? { ...s, status: action === "approve" ? "approved" : "rejected", updated_at: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Moderate error:", err);
    }
    setActionLoading(null);
  }

  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "verified", label: "Verified", count: stats.verified },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Switch Stories</h1>
          <p className="text-sm text-slate-500 mt-1">User stories about switching brokers — social proof to help others make decisions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportStories} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors">Export CSV ↓</button>
          <button
            onClick={load}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} highlight={stats.pending > 0} />
        <StatCard label="Verified" value={stats.verified} highlight={stats.verified > 0} />
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
                ? "bg-emerald-800 text-white"
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
        placeholder="Search by name, email, broker, or title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 mb-4"
      />

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">{selected.size} stor{selected.size !== 1 ? "ies" : "y"} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={async () => { for (const id of selected) await handleModerate(id, "approve"); setSelected(new Set()); }} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">Approve All</button>
            <button onClick={async () => { for (const id of selected) await handleModerate(id, "reject"); setSelected(new Set()); }} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Reject All</button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">Loading stories...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={paginated.length > 0 && selected.size === paginated.length} onChange={() => { if (selected.size === paginated.length) setSelected(new Set()); else setSelected(new Set(paginated.map(s => s.id))); }} className="w-4 h-4 rounded border-slate-300" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ratings</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((story) => (
                <tr key={story.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 w-8">
                    <input type="checkbox" checked={selected.has(story.id)} onChange={() => { setSelected(prev => { const next = new Set(prev); if (next.has(story.id)) next.delete(story.id); else next.add(story.id); return next; }); }} className="w-4 h-4 rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{story.source_broker_slug}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{story.dest_broker_slug}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{story.display_name}</div>
                    <div className="text-xs text-slate-400">{story.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Stars rating={story.source_rating} />
                      <span className="text-xs text-slate-400 mx-0.5">→</span>
                      <Stars rating={story.dest_rating} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === story.id ? null : story.id)}
                      className="text-sm text-slate-700 hover:text-emerald-700 text-left max-w-[200px] truncate transition-colors"
                      title={story.title}
                    >
                      {story.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[story.status]}`}>
                      {story.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(story.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {(story.status === "verified" || story.status === "pending") ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleModerate(story.id, "approve")}
                          disabled={actionLoading === story.id}
                          className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors disabled:opacity-50 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(story.id, "reject")}
                          disabled={actionLoading === story.id}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    ) : story.status === "approved" ? (
                      <button
                        onClick={() => handleModerate(story.id, "reject")}
                        disabled={actionLoading === story.id}
                        className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    ) : (
                      <button
                        onClick={() => handleModerate(story.id, "approve")}
                        disabled={actionLoading === story.id}
                        className="px-2 py-1 text-xs bg-emerald-50 text-emerald-500 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    {search || tab !== "all" ? "No stories match your filters." : "No switch stories yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Expanded story detail */}
          {expandedId && (() => {
            const s = stories.find((st) => st.id === expandedId);
            if (!s) return null;
            return (
              <div className="border-t border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">{s.title}</h3>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  <strong>{s.source_broker_slug}</strong> → <strong>{s.dest_broker_slug}</strong>
                  {" "}({s.source_rating}★ → {s.dest_rating}★)
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line mb-3">{s.body}</p>
                {s.reason && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-2">
                    <p className="text-xs font-bold text-blue-700 mb-1">Reason for switching</p>
                    <p className="text-xs text-slate-700">{s.reason}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {s.estimated_savings && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Saves {s.estimated_savings}
                    </span>
                  )}
                  {s.time_with_source && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {s.time_with_source} with old broker
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-3 space-y-1">
                  <p>Email: {s.email}</p>
                  <p>Verified: {s.verified_at ? new Date(s.verified_at).toLocaleString("en-AU") : "Not yet"}</p>
                  <p>Last updated: {new Date(s.updated_at).toLocaleString("en-AU")}</p>
                  {s.moderation_note && <p>Note: {s.moderation_note}</p>}
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

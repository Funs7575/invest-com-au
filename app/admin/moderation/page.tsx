"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

/* ── Types ── */

type ContentType = "review" | "story" | "question";
type SortOption = "newest" | "oldest" | "type";
type TabFilter = "all" | "review" | "story" | "question";

interface ModerationItem {
  id: number;
  type: ContentType;
  submittedBy: string;
  email: string;
  dateSubmitted: string;
  contentPreview: string;
  fullContent: string;
  brokerName: string;
  status: string;
  /** Extra detail fields for expanded view */
  meta: Record<string, unknown>;
}

/* ── Badge colours (matching existing codebase conventions) ── */

const typeBadge: Record<ContentType, { bg: string; label: string }> = {
  review:   { bg: "bg-blue-100 text-blue-700",   label: "Review" },
  story:    { bg: "bg-purple-100 text-purple-700", label: "Story" },
  question: { bg: "bg-amber-100 text-amber-700",  label: "Question" },
};

const statusColors: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  verified: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

/* ── Helpers ── */

function truncate(text: string, lines: number = 2): string {
  const parts = text.split("\n").slice(0, lines);
  const joined = parts.join(" ").trim();
  return joined.length > 180 ? joined.slice(0, 177) + "..." : joined;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── Page ── */

export default function ModerationQueuePage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moderationNote, setModerationNote] = useState("");

  const supabase = createClient();

  /* ── Data loading ── */

  const load = useCallback(async () => {
    setLoading(true);
    const [reviewsRes, storiesRes, questionsRes] = await Promise.all([
      supabase
        .from("user_reviews")
        .select("*")
        .in("status", ["pending", "verified"])
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("switch_stories")
        .select("*")
        .in("status", ["pending", "verified"])
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("broker_questions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const merged: ModerationItem[] = [];

    // Reviews
    if (reviewsRes.data) {
      for (const r of reviewsRes.data) {
        merged.push({
          id: r.id,
          type: "review",
          submittedBy: r.display_name,
          email: r.email,
          dateSubmitted: r.created_at,
          contentPreview: truncate(`${r.title}\n${r.body}`),
          fullContent: r.body,
          brokerName: r.broker_slug,
          status: r.status,
          meta: {
            title: r.title,
            rating: r.rating,
            pros: r.pros,
            cons: r.cons,
            verified_at: r.verified_at,
            moderation_note: r.moderation_note,
          },
        });
      }
    }

    // Stories
    if (storiesRes.data) {
      for (const s of storiesRes.data) {
        merged.push({
          id: s.id,
          type: "story",
          submittedBy: s.display_name,
          email: s.email,
          dateSubmitted: s.created_at,
          contentPreview: truncate(`${s.title}\n${s.body}`),
          fullContent: s.body,
          brokerName: `${s.source_broker_slug} \u2192 ${s.dest_broker_slug}`,
          status: s.status,
          meta: {
            title: s.title,
            source_broker: s.source_broker_slug,
            dest_broker: s.dest_broker_slug,
            source_rating: s.source_rating,
            dest_rating: s.dest_rating,
            reason: s.reason,
            estimated_savings: s.estimated_savings,
            time_with_source: s.time_with_source,
            verified_at: s.verified_at,
            moderation_note: s.moderation_note,
          },
        });
      }
    }

    // Questions
    if (questionsRes.data) {
      for (const q of questionsRes.data) {
        merged.push({
          id: q.id,
          type: "question",
          submittedBy: q.display_name,
          email: q.email || "",
          dateSubmitted: q.created_at,
          contentPreview: truncate(q.question),
          fullContent: q.question,
          brokerName: q.broker_slug,
          status: q.status,
          meta: {
            page_type: q.page_type,
            page_slug: q.page_slug,
          },
        });
      }
    }

    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Stats ── */

  const stats = useMemo(() => {
    const reviews = items.filter((i) => i.type === "review").length;
    const stories = items.filter((i) => i.type === "story").length;
    const questions = items.filter((i) => i.type === "question").length;
    return { total: items.length, reviews, stories, questions };
  }, [items]);

  /* ── Filtering, search, sort ── */

  const filtered = useMemo(() => {
    let list = items;
    if (tab !== "all") list = list.filter((i) => i.type === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.submittedBy.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.brokerName.toLowerCase().includes(q) ||
          i.contentPreview.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === "newest") return new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime();
      if (sort === "oldest") return new Date(a.dateSubmitted).getTime() - new Date(b.dateSubmitted).getTime();
      // sort by type name
      return a.type.localeCompare(b.type);
    });
    return list;
  }, [items, tab, search, sort]);

  /* ── Unique key ── */

  const itemKey = (item: ModerationItem) => `${item.type}-${item.id}`;

  /* ── Moderation actions ── */

  async function handleModerate(item: ModerationItem, action: "approve" | "reject") {
    const key = itemKey(item);
    setActionLoading(key);
    try {
      let ok = false;
      if (item.type === "review") {
        const res = await fetch("/api/user-review/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_id: item.id, action, moderation_note: moderationNote || undefined }),
        });
        ok = res.ok;
      } else if (item.type === "story") {
        const res = await fetch("/api/switch-story/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story_id: item.id, action, moderation_note: moderationNote || undefined }),
        });
        ok = res.ok;
      } else if (item.type === "question") {
        const res = await fetch("/api/questions/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "question", id: item.id, action }),
        });
        ok = res.ok;
      }
      if (ok) {
        setItems((prev) => prev.filter((i) => itemKey(i) !== key));
        setSelected((prev) => { const next = new Set(prev); next.delete(key); return next; });
        setModerationNote("");
      }
    } catch (err) {
      console.error("Moderate error:", err);
    }
    setActionLoading(null);
  }

  async function handleBulk(action: "approve" | "reject") {
    const toProcess = filtered.filter((i) => selected.has(itemKey(i)));
    for (const item of toProcess) {
      await handleModerate(item, action);
    }
    setSelected(new Set());
  }

  /* ── Selection helpers ── */

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(itemKey)));
    }
  }

  /* ── Tabs config ── */

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "review", label: "Reviews", count: stats.reviews },
    { key: "story", label: "Switch Stories", count: stats.stories },
    { key: "question", label: "Questions", count: stats.questions },
  ];

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Moderation Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve user-submitted content across all content types.
          </p>
        </div>
        <button
          onClick={load}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Pending" value={stats.total} highlight={stats.total > 0} />
        <StatCard label="Reviews Pending" value={stats.reviews} color="blue" />
        <StatCard label="Stories Pending" value={stats.stories} color="purple" />
        <StatCard label="Questions Pending" value={stats.questions} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(new Set()); }}
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

      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, broker, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="type">Sort by Type</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            {selected.size} item{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulk("approve")}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulk("reject")}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Content list */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
          Loading moderation queue...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <p className="text-slate-600 font-medium">All clear!</p>
          <p className="text-sm text-slate-400 mt-1">
            {search || tab !== "all" ? "No items match your filters." : "No content pending review."}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Select-all row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-t-lg">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selected.size === filtered.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-xs text-slate-500 font-medium">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""} in queue
            </span>
          </div>

          <div className="bg-white border border-x-slate-200 border-b-slate-200 rounded-b-lg divide-y divide-slate-200">
            {filtered.map((item) => {
              const key = itemKey(item);
              const isExpanded = expandedKey === key;
              const isLoading = actionLoading === key;

              return (
                <div key={key}>
                  {/* Main row */}
                  <div className="flex items-start gap-3 px-4 py-4 hover:bg-slate-50 transition-colors">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggleSelect(key)}
                      className="w-4 h-4 rounded border-slate-300 mt-1 shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Type badge */}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge[item.type].bg}`}>
                          {typeBadge[item.type].label}
                        </span>
                        {/* Status badge */}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColors[item.status]}`}>
                          {item.status}
                        </span>
                        {/* Broker */}
                        <span className="text-xs text-slate-500 font-medium">{item.brokerName}</span>
                      </div>

                      {/* Content preview */}
                      <p className="text-sm text-slate-700 line-clamp-2 mb-1">{item.contentPreview}</p>

                      {/* Submitter + date */}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{item.submittedBy}</span>
                        {item.email && <span>{item.email}</span>}
                        <span>{formatDate(item.dateSubmitted)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleModerate(item, "approve")}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 font-medium"
                        title="Approve"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleModerate(item, "reject")}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 font-medium"
                        title="Reject"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        className="px-2.5 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                      >
                        {isExpanded ? "Close" : "Details"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {item.type === "review" && `Review: ${(item.meta.title as string) || "Untitled"}`}
                          {item.type === "story" && `Story: ${(item.meta.title as string) || "Untitled"}`}
                          {item.type === "question" && "Question Detail"}
                        </h3>
                        <button
                          onClick={() => setExpandedKey(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Close
                        </button>
                      </div>

                      {/* Full content */}
                      <p className="text-sm text-slate-700 whitespace-pre-line mb-4">{item.fullContent}</p>

                      {/* Type-specific meta */}
                      {item.type === "review" && (
                        <div className="space-y-2 mb-4">
                          {item.meta.rating && (
                            <div className="text-xs text-slate-500">
                              Rating: <strong className="text-amber-600">{String(item.meta.rating)}/5</strong>
                            </div>
                          )}
                          {item.meta.pros && (
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs font-bold text-green-700 mb-1">Pros</p>
                              <p className="text-xs text-slate-700">{String(item.meta.pros)}</p>
                            </div>
                          )}
                          {item.meta.cons && (
                            <div className="bg-red-50 rounded-lg p-3">
                              <p className="text-xs font-bold text-red-700 mb-1">Cons</p>
                              <p className="text-xs text-slate-700">{String(item.meta.cons)}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {item.type === "story" && (
                        <div className="space-y-2 mb-4">
                          <div className="text-xs text-slate-500">
                            <strong>{String(item.meta.source_broker)}</strong> ({String(item.meta.source_rating)}/5)
                            {" \u2192 "}
                            <strong>{String(item.meta.dest_broker)}</strong> ({String(item.meta.dest_rating)}/5)
                          </div>
                          {item.meta.reason && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs font-bold text-blue-700 mb-1">Reason for switching</p>
                              <p className="text-xs text-slate-700">{String(item.meta.reason)}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {item.meta.estimated_savings && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                Saves {String(item.meta.estimated_savings)}
                              </span>
                            )}
                            {item.meta.time_with_source && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                {String(item.meta.time_with_source)} with old broker
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {item.type === "question" && (
                        <div className="space-y-1 mb-4 text-xs text-slate-500">
                          <p>Page: {String(item.meta.page_slug)} ({String(item.meta.page_type)})</p>
                        </div>
                      )}

                      {/* Submitter info */}
                      <div className="text-xs text-slate-400 space-y-1 mb-4">
                        <p>Submitted by: {item.submittedBy}{item.email ? ` (${item.email})` : ""}</p>
                        <p>Date: {new Date(item.dateSubmitted).toLocaleString("en-AU")}</p>
                        {item.meta.verified_at && (
                          <p>Verified: {new Date(String(item.meta.verified_at)).toLocaleString("en-AU")}</p>
                        )}
                        {item.meta.moderation_note && (
                          <p>Previous note: {String(item.meta.moderation_note)}</p>
                        )}
                      </div>

                      {/* Moderation note + actions */}
                      <div className="border-t border-slate-200 pt-4">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                          Moderation Note (optional)
                        </label>
                        <textarea
                          value={moderationNote}
                          onChange={(e) => setModerationNote(e.target.value)}
                          placeholder="Add a reason for rejection or internal note..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 mb-3"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleModerate(item, "approve")}
                            disabled={actionLoading === key}
                            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === key ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleModerate(item, "reject")}
                            disabled={actionLoading === key}
                            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === key ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/* ── Stat Card ── */

function StatCard({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  color?: "blue" | "purple" | "amber";
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };

  const isHighlight = highlight || (value > 0 && color);
  const classes = color && value > 0
    ? colorMap[color]
    : highlight
      ? "bg-amber-50 border-amber-200"
      : "bg-white border-slate-200";

  return (
    <div className={`border rounded-lg p-4 ${classes}`}>
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold ${isHighlight && color ? "" : highlight ? "text-amber-700" : "text-slate-900"}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

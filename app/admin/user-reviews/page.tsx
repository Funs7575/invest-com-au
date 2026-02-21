"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

type Review = {
  id: number;
  broker_id: number;
  broker_slug: string;
  display_name: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  pros: string | null;
  cons: string | null;
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
  approved: "bg-green-100 text-green-700",
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

export default function AdminUserReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data) setReviews(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [search, tab]);

  // Stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => r.status === "pending").length;
    const verified = reviews.filter((r) => r.status === "verified").length;
    const approved = reviews.filter((r) => r.status === "approved").length;
    const rejected = reviews.filter((r) => r.status === "rejected").length;
    return { total, pending, verified, approved, rejected };
  }, [reviews]);

  // Filtered
  const filtered = useMemo(() => {
    let list = reviews;
    if (tab !== "all") {
      list = list.filter((r) => r.status === tab);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.display_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.broker_slug.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reviews, tab, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Moderate action
  async function handleModerate(reviewId: number, action: "approve" | "reject") {
    setActionLoading(reviewId);
    try {
      const res = await fetch("/api/user-review/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, action }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, status: action === "approve" ? "approved" : "rejected", updated_at: new Date().toISOString() }
              : r
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
        <h1 className="text-2xl font-bold text-slate-900">User Reviews</h1>
        <button
          onClick={load}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Refresh
        </button>
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
        placeholder="Search by name, email, broker, or title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 mb-4"
      />

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm animate-pulse">Loading reviews...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{review.broker_slug}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{review.display_name}</div>
                    <div className="text-xs text-slate-400">{review.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={review.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                      className="text-sm text-slate-700 hover:text-green-700 text-left max-w-[200px] truncate transition-colors"
                      title={review.title}
                    >
                      {review.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[review.status]}`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(review.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {(review.status === "verified" || review.status === "pending") ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleModerate(review.id, "approve")}
                          disabled={actionLoading === review.id}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(review.id, "reject")}
                          disabled={actionLoading === review.id}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    ) : review.status === "approved" ? (
                      <button
                        onClick={() => handleModerate(review.id, "reject")}
                        disabled={actionLoading === review.id}
                        className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    ) : (
                      <button
                        onClick={() => handleModerate(review.id, "approve")}
                        disabled={actionLoading === review.id}
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
                    {search || tab !== "all" ? "No reviews match your filters." : "No user reviews yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Expanded review detail */}
          {expandedId && (() => {
            const r = reviews.find((rv) => rv.id === expandedId);
            if (!r) return null;
            return (
              <div className="border-t border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">{r.title}</h3>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line mb-3">{r.body}</p>
                {r.pros && (
                  <div className="bg-green-50 rounded-lg p-3 mb-2">
                    <p className="text-xs font-bold text-green-700 mb-1">Pros</p>
                    <p className="text-xs text-slate-700">{r.pros}</p>
                  </div>
                )}
                {r.cons && (
                  <div className="bg-red-50 rounded-lg p-3 mb-2">
                    <p className="text-xs font-bold text-red-700 mb-1">Cons</p>
                    <p className="text-xs text-slate-700">{r.cons}</p>
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-3 space-y-1">
                  <p>Email: {r.email}</p>
                  <p>Verified: {r.verified_at ? new Date(r.verified_at).toLocaleString("en-AU") : "Not yet"}</p>
                  <p>Last updated: {new Date(r.updated_at).toLocaleString("en-AU")}</p>
                  {r.moderation_note && <p>Note: {r.moderation_note}</p>}
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

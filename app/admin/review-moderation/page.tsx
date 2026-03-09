"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

interface PendingReview {
  id: number;
  professional_id: number;
  reviewer_name: string;
  reviewer_email?: string;
  rating: number;
  title?: string;
  body: string;
  status: string;
  created_at: string;
  professionals?: { name: string; slug: string } | null;
}

export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("professional_reviews")
      .select("*, professionals(name, slug)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setReviews((data as PendingReview[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (ids: number[], action: "approve" | "reject" | "flag") => {
    if (ids.length === 0) return;
    const labels: Record<string, string> = { approve: "Approve", reject: "Reject", flag: "Flag" };
    if (!confirm(`${labels[action]} ${ids.length} review(s)?`)) return;

    setActing(true);
    try {
      const res = await fetch("/api/admin/review-moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Action failed");
      }
    } catch {
      alert("Network error");
    }
    setActing(false);
  };

  const renderStars = (rating: number) => {
    return (
      <span className="text-amber-400 text-xs tracking-tight">
        {"★".repeat(rating)}
        {"☆".repeat(5 - rating)}
      </span>
    );
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Review Moderation Queue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Approve, reject, or flag pending advisor reviews before they go public.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading pending reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">All clear</h2>
          <p className="text-sm text-slate-500">No pending reviews to moderate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-amber-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{r.reviewer_name}</span>
                    <span className="text-slate-400 text-xs">reviewed</span>
                    <span className="text-sm font-semibold text-blue-700">
                      {r.professionals?.name || `Advisor #${r.professional_id}`}
                    </span>
                    {renderStars(r.rating)}
                  </div>
                  {r.reviewer_email && (
                    <div className="text-[0.62rem] text-slate-400 mt-0.5">{r.reviewer_email}</div>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                  {new Date(r.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {r.title && (
                <div className="text-sm font-semibold text-slate-800 mb-1">{r.title}</div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">
                {r.body}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleAction([r.id], "approve")}
                  disabled={acting}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction([r.id], "reject")}
                  disabled={acting}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction([r.id], "flag")}
                  disabled={acting}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-3 py-1.5 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                >
                  Flag
                </button>
                {r.professionals?.slug && (
                  <a
                    href={`/advisor/${r.professionals.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 ml-auto"
                  >
                    View Advisor
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

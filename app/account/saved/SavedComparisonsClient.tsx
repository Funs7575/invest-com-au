"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import EmptyState from "@/components/directory/EmptyState";

interface SavedComparison {
  id: string;
  name: string;
  broker_slugs: string[];
  quiz_results: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function SavedComparisonsClient() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  // Per-row rename error so the failed rename can be retried in place
  // without losing the user's typed value or hijacking the page-level banner.
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchComparisons = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-comparisons");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setComparisons(data.comparisons ?? []);
      setError(null);
    } catch {
      setError("Failed to load saved comparisons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/auth/login?next=/account/saved");
      return;
    }
    fetchComparisons();
  }, [user, userLoading, router, fetchComparisons]);

  const handleRename = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    setRenameLoading(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/saved-comparisons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        // Try to surface the server-side message (validation, conflict, etc)
        // so users see "That name is already taken" instead of a generic
        // failure and retry-loop with the same name.
        let msg = "Failed to rename comparison.";
        try {
          const err = await res.json();
          if (err?.error && typeof err.error === "string") msg = err.error;
        } catch {
          // ignore parse errors; keep default message
        }
        setRenameError(msg);
        return;
      }

      const data = await res.json();
      setComparisons((prev) =>
        prev.map((c) => (c.id === id ? data.comparison : c))
      );
      setEditingId(null);
      setRenameError(null);
    } catch {
      // Network error — keep edit form open so user can retry their input
      setRenameError("Network error. Please check your connection and try again.");
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/saved-comparisons/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setComparisons((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null);
    } catch {
      setError("Failed to delete comparison.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const startRename = (comparison: SavedComparison) => {
    setEditingId(comparison.id);
    setEditName(comparison.name);
    setRenameError(null);
    setDeletingId(null);
  };

  if (userLoading || loading) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-2xl">
          <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading saved comparisons…">
            <div className="h-8 bg-slate-200 rounded w-56" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/account"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Back to account"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Saved Comparisons</h1>
        </div>

        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Empty state */}
        {comparisons.length === 0 && (
          <EmptyState
            icon="bar-chart"
            title="No saved comparisons yet"
            body="Compare brokers side by side, then save your shortlist — you can return to it any time."
            ctas={[{ label: "Start comparing", href: "/compare" }]}
          />
        )}

        {/* Comparisons list */}
        <div className="space-y-3">
          {comparisons.map((comparison) => (
            <div
              key={comparison.id}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              {/* Name row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                {editingId === comparison.id ? (
                  <form
                    className="flex flex-col gap-1 flex-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(comparison.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => { setEditName(e.target.value); if (renameError) setRenameError(null); }}
                        className={`flex-1 px-2 py-1 text-sm font-semibold text-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${renameError ? "border-red-400 focus:ring-red-500" : "border-slate-300 focus:ring-blue-500"}`}
                        autoFocus
                        maxLength={100}
                        disabled={renameLoading}
                        aria-invalid={!!renameError}
                        aria-describedby={renameError ? "saved-rename-error" : undefined}
                      />
                      <button
                        type="submit"
                        disabled={renameLoading || !editName.trim()}
                        aria-busy={renameLoading}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {renameLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setRenameError(null); }}
                        className="text-xs text-slate-500 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                    {renameError && (
                      <p id="saved-rename-error" role="alert" className="text-xs text-red-600">{renameError}</p>
                    )}
                  </form>
                ) : (
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {comparison.name}
                  </h3>
                )}

                {editingId !== comparison.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startRename(comparison)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Rename comparison"
                      title="Rename"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(comparison.id);
                        setEditingId(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label="Delete comparison"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <span>{comparison.broker_slugs.length} broker{comparison.broker_slugs.length !== 1 ? "s" : ""}</span>
                <span className="text-slate-300">|</span>
                <span>
                  Saved{" "}
                  {new Date(comparison.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {comparison.notes && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="truncate max-w-[150px]" title={comparison.notes}>
                      {comparison.notes}
                    </span>
                  </>
                )}
              </div>

              {/* Delete confirmation */}
              {deletingId === comparison.id && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-red-700 mb-2">Are you sure you want to delete this comparison?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(comparison.id)}
                      disabled={deleteLoading}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* View comparison link */}
              <Link
                href={`/compare?brokers=${comparison.broker_slugs.join(",")}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Comparison
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        {/* Footer count */}
        {comparisons.length > 0 && (
          <p className="mt-4 text-xs text-slate-500 text-center">
            {comparisons.length} of 25 saved comparisons used
          </p>
        )}
      </div>
    </div>
  );
}

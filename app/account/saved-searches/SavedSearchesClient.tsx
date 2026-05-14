"use client";

/**
 * Saved-searches management screen.
 *
 * Lists every saved search the user owns, with a kind icon, label,
 * frequency dropdown, and a delete button.
 *
 * Out of scope: a "save this search" button on /advisors and /teams —
 * the brief is explicit that this screen is management-only. Users will
 * land here either from /account (tile) or from an alert email's
 * "Manage saved searches" footer link.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useUser } from "@/lib/hooks/useUser";

type Kind = "advisors" | "teams" | "invest";
type Frequency = "off" | "daily" | "weekly";

interface SavedSearch {
  id: number;
  kind: Kind;
  label: string;
  filters: Record<string, unknown>;
  email_frequency: Frequency;
  last_alerted_at: string | null;
  created_at: string;
}

const KIND_META: Record<Kind, { icon: string; label: string; href: string }> = {
  advisors: { icon: "🧑‍💼", label: "Advisors", href: "/advisors" },
  teams: { icon: "🤝", label: "Teams", href: "/teams" },
  invest: { icon: "📈", label: "Invest", href: "/invest" },
};

export default function SavedSearchesClient() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-searches");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows((data.saved_searches as SavedSearch[]) ?? []);
      setError(null);
    } catch {
      setError("Failed to load saved searches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/auth/login?next=/account/saved-searches");
      return;
    }
    load();
  }, [user, userLoading, router, load]);

  const updateFrequency = async (id: number, frequency: Frequency) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_frequency: frequency }),
      });
      if (!res.ok) throw new Error("update failed");
      const data = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, email_frequency: data.saved_search.email_frequency as Frequency } : r,
        ),
      );
    } catch {
      setError("Could not update the alert frequency.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this saved search?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Could not delete the saved search.");
    } finally {
      setBusyId(null);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-2xl">
          <div className="animate-pulse space-y-4">
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
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/account"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Back to account"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Saved Searches</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {rows.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              No saved searches yet
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Save an advisor or team filter to get a daily digest when new
              providers match.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/advisors"
                className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Browse Advisors
              </Link>
              <Link
                href="/teams"
                className="inline-block px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Browse Teams
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {rows.map((row) => {
            const meta = KIND_META[row.kind];
            const busy = busyId === row.id;
            return (
              <div
                key={row.id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl shrink-0" aria-hidden>
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {row.label}
                      </h3>
                      <p className="text-xs text-slate-500">{meta.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(row.id)}
                    disabled={busy}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    aria-label="Delete saved search"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-slate-600 flex items-center gap-2">
                    Alerts
                    <select
                      value={row.email_frequency}
                      onChange={(e) =>
                        updateFrequency(row.id, e.target.value as Frequency)
                      }
                      disabled={busy}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white disabled:opacity-50"
                    >
                      <option value="off">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>
                  <Link
                    href={meta.href}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Open {meta.label.toLowerCase()} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface TeamRow {
  id: number;
  slug: string;
  name: string;
  team_category: string;
  team_type: string;
  verification_status: string;
  public: boolean;
  accepts_briefs: boolean;
  description: string | null;
  disclosure: string | null;
  created_at: string;
}

const STATUS_TABS = ["submitted", "verified", "rejected", "draft", "suspended"] as const;

type Tab = (typeof STATUS_TABS)[number];

export default function AdminExpertTeamsPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [tab, setTab] = useState<Tab>("submitted");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expert_teams")
      .select("*")
      .eq("verification_status", tab)
      .order("created_at", { ascending: false });
    setTeams((data ?? []) as TeamRow[]);
    setLoading(false);
  }, [supabase, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(id: number, approved: boolean) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/expert-teams/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved,
          rejection_reason: approved ? undefined : rejectReason || "Did not meet criteria",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Action failed");
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="Expert Teams" subtitle="Verification queue + public teams.">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                tab === t
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-slate-500">No teams in this state.</p>
        ) : (
          <div className="space-y-3">
            {teams.map((t) => (
              <article
                key={t.id}
                className="border border-slate-200 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.team_category.replace(/_/g, " ")} · {t.team_type.replace(/_/g, " ")} ·
                      created {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tab === "submitted" && (
                      <>
                        <button
                          type="button"
                          disabled={busy === t.id}
                          onClick={() => action(t.id, true)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-md"
                        >
                          Approve
                        </button>
                        <input
                          type="text"
                          placeholder="Rejection reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="text-xs border border-slate-300 rounded-md px-2 py-1"
                        />
                        <button
                          type="button"
                          disabled={busy === t.id}
                          onClick={() => action(t.id, false)}
                          className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-md"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <Link
                      href={`/teams/${t.slug}`}
                      className="text-xs text-amber-700 underline"
                    >
                      Public profile
                    </Link>
                  </div>
                </div>
                {t.description && (
                  <p className="text-sm text-slate-600 mt-2">{t.description}</p>
                )}
                {t.disclosure && (
                  <p className="text-xs text-slate-500 mt-2">
                    <strong>Disclosure:</strong> {t.disclosure}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

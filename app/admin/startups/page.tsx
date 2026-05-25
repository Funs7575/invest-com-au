"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type StartupRow = {
  id: string;
  company_name: string;
  slug: string;
  stage: string;
  sector: string[];
  abn: string | null;
  esic_eligible_self_attested: boolean;
  linkedin_url: string | null;
  status: string;
  created_at: string;
  owner_user_id: string;
};

type Tab = "draft" | "active" | "rejected";

export default function AdminStartupsPage() {
  const [tab, setTab] = useState<Tab>("draft");
  const [rows, setRows] = useState<StartupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const supabase = createClient();

  const loadRows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("startup_profiles")
      .select("id, company_name, slug, stage, sector, abn, esic_eligible_self_attested, linkedin_url, status, created_at, owner_user_id")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as StartupRow[]);
    setLoading(false);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loadRows is async; setState calls are in resolved promise, not synchronous effect body
  useEffect(() => { void loadRows(); }, [loadRows]);

  async function handleReview(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/admin/startups/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      setToast(`Error: ${String(json.error ?? "Unknown error")}`);
    } else {
      setToast(`${action === "approve" ? "Approved" : "Rejected"}: ${id}`);
      setActionId(null);
      setNotes("");
      await loadRows();
    }
    setTimeout(() => setToast(null), 4000);
  }

  const TAB_LABELS: Record<Tab, string> = { draft: "Pending review", active: "Approved", rejected: "Rejected" };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Startup Profiles</h1>
        <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-900">← Admin</Link>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
          {toast}
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["draft", "active", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? "bg-white border border-b-white border-slate-200 text-slate-900 -mb-px"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No {tab} startups.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900">{row.company_name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {row.stage}
                    </span>
                    {row.esic_eligible_self_attested && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        ESIC self-attested
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    ABN: {row.abn ?? "—"} · Sectors: {row.sector.join(", ")} ·{" "}
                    {new Date(row.created_at).toLocaleDateString("en-AU")}
                  </p>
                  {row.linkedin_url && (
                    <a
                      href={row.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-600 hover:underline"
                    >
                      LinkedIn ↗
                    </a>
                  )}
                </div>

                {tab === "draft" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {actionId === row.id ? (
                      <div className="flex flex-col gap-2 w-64">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional review notes..."
                          className="text-xs rounded-lg border border-slate-200 px-2 py-1 resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleReview(row.id, "approve")}
                            className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void handleReview(row.id, "reject")}
                            className="flex-1 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => { setActionId(null); setNotes(""); }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActionId(row.id)}
                        className="px-4 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700"
                      >
                        Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

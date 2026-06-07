"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface BriefRow {
  id: number;
  slug: string;
  job_title: string;
  brief_template: string | null;
  status: string;
  tracker_status: string;
  risk_review_status: string;
  risk_flags: string[];
  provider_preference: string | null;
  routing_mode: string | null;
  created_at: string;
  accept_credits_cost: number | null;
  contact_email: string | null;
}

const TABS = [
  { value: "pending_review", label: "Risk review" },
  { value: "open_no_accept", label: "Open · unaccepted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default function AdminBriefsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("pending_review");
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectingBriefId, setRejectingBriefId] = useState<number | null>(null);
  const [briefRejectNote, setBriefRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("advisor_auctions")
      .select(
        "id, slug, job_title, brief_template, status, tracker_status, risk_review_status, risk_flags, provider_preference, routing_mode, created_at, accept_credits_cost, contact_email",
      )
      .eq("flow_type", "accept")
      .order("created_at", { ascending: false })
      .limit(100);
    if (tab === "pending_review") q = q.eq("risk_review_status", "pending_review");
    if (tab === "open_no_accept")
      q = q.eq("status", "open").is("accepted_by_professional_id", null).is("accepted_by_team_id", null);
    if (tab === "accepted") q = q.not("accepted_at", "is", null);
    if (tab === "rejected") q = q.eq("risk_review_status", "rejected");
    const { data } = await q;
    setBriefs((data ?? []) as BriefRow[]);
    setLoading(false);
  }, [supabase, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewAction(id: number, action: "approve" | "reject", note?: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/briefs/${id}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(note?.trim() ? { note: note.trim() } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Action failed");
      setRejectingBriefId(null);
      setBriefRejectNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="Match Requests" subtitle="Risk review queue, routing visibility, and audit.">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                tab === t.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.label}
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
        ) : briefs.length === 0 ? (
          <p className="text-sm text-slate-500">No briefs in this state.</p>
        ) : (
          <div className="space-y-2">
            {briefs.map((b) => (
              <article key={b.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/briefs/${b.slug}`}
                      className="text-sm font-bold text-slate-900 hover:underline"
                    >
                      {b.job_title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {b.brief_template} · {b.provider_preference ?? "any"} ·{" "}
                      {b.routing_mode ?? "smart_match"} ·{" "}
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                    {b.risk_flags?.length > 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        Flags: {b.risk_flags.join(", ")}
                      </p>
                    )}
                  </div>
                  {tab === "pending_review" && rejectingBriefId !== b.id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => void reviewAction(b.id, "approve")}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-md"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => { setRejectingBriefId(b.id); setBriefRejectNote(""); }}
                        className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-md"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                {rejectingBriefId === b.id && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <label htmlFor={`brief-reject-${b.id}`} className="block text-xs font-semibold text-red-800">Reject reason <span className="font-normal text-red-600">(sent to consumer — keep it short and respectful)</span></label>
                    <textarea
                      id={`brief-reject-${b.id}`}
                      value={briefRejectNote}
                      onChange={e => setBriefRejectNote(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 border border-red-200 rounded text-xs bg-white"
                      placeholder="Optional — leave blank to reject without a reason."
                      maxLength={500}
                    />
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setRejectingBriefId(null)} className="text-xs px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold">Cancel</button>
                      <button type="button" onClick={() => void reviewAction(b.id, "reject", briefRejectNote)} disabled={busy === b.id} className="text-xs px-3 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50">{busy === b.id ? "Rejecting…" : "Confirm reject"}</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

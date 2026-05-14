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

  async function reviewAction(id: number, action: "approve" | "reject") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/briefs/${id}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Action failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="Investor Briefs" subtitle="Risk review queue, routing visibility, and audit.">
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
                  {tab === "pending_review" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => reviewAction(b.id, "approve")}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-md"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => reviewAction(b.id, "reject")}
                        className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-md"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

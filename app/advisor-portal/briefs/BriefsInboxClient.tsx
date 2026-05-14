"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { MaskedBrief } from "@/lib/briefs/types";

interface AcceptedBrief {
  id: number;
  slug: string;
  job_title: string;
  brief_template: string | null;
  budget_band: string;
  location: string | null;
  tracker_status: string;
  accepted_at: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  accepted_by_team_id: number | null;
}

interface InboxData {
  available: MaskedBrief[];
  accepted: AcceptedBrief[];
  teamIds: number[];
}

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "call_booked", label: "Call booked" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "won", label: "Engaged" },
  { value: "lost", label: "Did not proceed" },
];

export default function BriefsInboxClient() {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/briefs/inbox");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load inbox");
      setData(json as InboxData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(slug: string, teamId?: number) {
    setBusy(slug);
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${slug}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not accept");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept");
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(slug: string, status: string) {
    setStatusBusy(slug);
    try {
      await fetch(`/api/briefs/${slug}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracker_status: status }),
      });
      await load();
    } finally {
      setStatusBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Available briefs ({data.available.length})
        </h2>
        {data.available.length === 0 ? (
          <p className="text-sm text-slate-500">
            No briefs matching your profile right now. We&apos;ll surface new
            briefs here as users submit them.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {data.available.map((b) => (
              <article
                key={b.id}
                className="bg-white border border-slate-200 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-0.5">
                      {b.brief_template ?? "general"}
                    </p>
                    <h3 className="text-base font-bold text-slate-900">
                      {b.job_title}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {b.location ?? "AU"} · {b.budget_band}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  {b.description_preview}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Accept cost: {" "}
                    <strong className="text-slate-900">
                      {b.accept_credits_cost ?? "?"} credits
                    </strong>
                  </span>
                  {b.provider_preference === "expert_team" &&
                    data.teamIds.length > 0 && (
                      <select
                        className="text-xs border border-slate-200 rounded-md px-2 py-1"
                        onChange={(e) => {
                          if (e.target.value) {
                            void accept(b.slug, Number(e.target.value));
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Accept as team…
                        </option>
                        {data.teamIds.map((t) => (
                          <option key={t} value={t}>
                            Team #{t}
                          </option>
                        ))}
                      </select>
                    )}
                  <button
                    type="button"
                    onClick={() => accept(b.slug)}
                    disabled={busy === b.slug}
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg"
                  >
                    {busy === b.slug ? "Accepting…" : "Accept & unlock"}
                    <Icon name="arrow-right" size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Accepted briefs ({data.accepted.length})
        </h2>
        {data.accepted.length === 0 ? (
          <p className="text-sm text-slate-500">
            Briefs you accept will show up here with the consumer&apos;s contact details.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {data.accepted.map((b) => (
              <article
                key={b.id}
                className="bg-white border border-emerald-200 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-700 mb-0.5">
                      Accepted · {new Date(b.accepted_at).toLocaleDateString()}
                    </p>
                    <h3 className="text-base font-bold text-slate-900">
                      {b.job_title}
                    </h3>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
                  <dt className="font-semibold text-slate-500">Name</dt>
                  <dd className="text-slate-800">{b.contact_name ?? "—"}</dd>
                  <dt className="font-semibold text-slate-500">Email</dt>
                  <dd className="text-slate-800">{b.contact_email ?? "—"}</dd>
                  <dt className="font-semibold text-slate-500">Phone</dt>
                  <dd className="text-slate-800">{b.contact_phone ?? "—"}</dd>
                  <dt className="font-semibold text-slate-500">Location</dt>
                  <dd className="text-slate-800">{b.location ?? "—"}</dd>
                  <dt className="font-semibold text-slate-500">Budget</dt>
                  <dd className="text-slate-800">{b.budget_band}</dd>
                </dl>
                <div className="flex items-center gap-2">
                  <select
                    value={b.tracker_status}
                    disabled={statusBusy === b.slug}
                    onChange={(e) => changeStatus(b.slug, e.target.value)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">
                    Update status as you progress.
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

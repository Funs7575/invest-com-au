"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import BriefDossierPanel from "./BriefDossierPanel";
import type { MaskedBrief } from "@/lib/briefs/types";
import type { BriefDossier } from "@/lib/brief-intel";

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
  teams: { id: number; name: string }[];
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
  const [topUpNeeded, setTopUpNeeded] = useState(false);
  // Full masked details per slug, fetched lazily on "View details".
  const [details, setDetails] = useState<Record<string, MaskedBrief | "loading" | undefined>>({});
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  // Intelligence dossiers per slug, fetched lazily on "Dossier" expand —
  // one GET per expanded brief, never bulk-loaded with the inbox.
  const [dossiers, setDossiers] = useState<
    Record<string, BriefDossier | "loading" | "error" | undefined>
  >({});
  const [openDossiers, setOpenDossiers] = useState<Record<string, boolean>>({});

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
    setTopUpNeeded(false);
    try {
      const res = await fetch(`/api/briefs/${slug}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Surface a real "Top up" link instead of dead-end plain text (AJ-5).
        if (json?.reason === "insufficient_credits") setTopUpNeeded(true);
        throw new Error(json?.error ?? "Could not accept");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept");
    } finally {
      setBusy(null);
    }
  }

  async function toggleDetails(slug: string) {
    const nowOpen = !openDetails[slug];
    setOpenDetails((prev) => ({ ...prev, [slug]: nowOpen }));
    if (!nowOpen || details[slug]) return;
    setDetails((prev) => ({ ...prev, [slug]: "loading" }));
    try {
      const res = await fetch(`/api/briefs/${slug}/preview`);
      const json = await res.json();
      if (!res.ok || !json?.brief) throw new Error(json?.error ?? "Could not load details");
      setDetails((prev) => ({ ...prev, [slug]: json.brief as MaskedBrief }));
    } catch {
      setDetails((prev) => ({ ...prev, [slug]: undefined }));
      setOpenDetails((prev) => ({ ...prev, [slug]: false }));
    }
  }

  async function toggleDossier(slug: string) {
    const nowOpen = !openDossiers[slug];
    setOpenDossiers((prev) => ({ ...prev, [slug]: nowOpen }));
    const cached = dossiers[slug];
    if (!nowOpen || (cached && cached !== "error")) return;
    setDossiers((prev) => ({ ...prev, [slug]: "loading" }));
    try {
      const res = await fetch(`/api/briefs/${slug}/dossier`);
      const json = await res.json();
      if (!res.ok || !json?.dossier) throw new Error(json?.error ?? "Could not load dossier");
      setDossiers((prev) => ({ ...prev, [slug]: json.dossier as BriefDossier }));
    } catch {
      setDossiers((prev) => ({ ...prev, [slug]: "error" }));
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
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading your brief inbox">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse"
          >
            <div className="h-3 w-24 bg-slate-100 rounded mb-2" />
            <div className="h-4 w-2/3 bg-slate-200 rounded mb-3" />
            <div className="h-3 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }
  // Only a LOAD failure (no data yet) replaces the whole view; action errors
  // (e.g. a failed accept) render inline below so the inbox stays visible.
  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-12">
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          {topUpNeeded && (
            <a
              href="/advisor-portal/billing"
              className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-600 whitespace-nowrap"
            >
              Top up credits
              <Icon name="arrow-right" size={14} />
            </a>
          )}
        </div>
      )}
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
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
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
                {openDetails[b.slug] && details[b.slug] && details[b.slug] !== "loading" && (
                  <dl className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {Object.entries(
                      (details[b.slug] as MaskedBrief).brief_payload ?? {},
                    )
                      .filter(([, v]) => v !== null && v !== "" && v !== undefined)
                      .slice(0, 12)
                      .map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <dt className="inline font-semibold text-slate-600 capitalize">
                            {k.replace(/_/g, " ")}:
                          </dt>{" "}
                          <dd className="inline text-slate-700">
                            {Array.isArray(v) ? v.join(", ") : String(v)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
                {openDossiers[b.slug] && (
                  <div
                    id={`dossier-${b.id}`}
                    role="region"
                    aria-label={`Dossier for ${b.job_title}`}
                    className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    {dossiers[b.slug] === "loading" ? (
                      <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Loading dossier">
                        <div className="h-3 w-32 bg-slate-200 rounded" />
                        <div className="h-3 w-full bg-slate-200 rounded" />
                        <div className="h-3 w-2/3 bg-slate-200 rounded" />
                      </div>
                    ) : dossiers[b.slug] === "error" || !dossiers[b.slug] ? (
                      <p className="text-xs text-slate-500" role="status">
                        Couldn&apos;t load the dossier right now.{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDossiers((prev) => ({ ...prev, [b.slug]: false }));
                            void toggleDossier(b.slug);
                          }}
                          className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
                        >
                          Try again
                        </button>
                      </p>
                    ) : (
                      <BriefDossierPanel dossier={dossiers[b.slug] as BriefDossier} />
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDetails(b.slug)}
                    className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
                  >
                    {details[b.slug] === "loading"
                      ? "Loading…"
                      : openDetails[b.slug]
                        ? "Hide details"
                        : "View details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDossier(b.slug)}
                    aria-expanded={Boolean(openDossiers[b.slug])}
                    aria-controls={`dossier-${b.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
                  >
                    <Icon name="bar-chart-2" size={12} aria-hidden />
                    {openDossiers[b.slug] ? "Hide dossier" : "Dossier"}
                  </button>
                  <span className="text-xs text-slate-500">
                    Accept cost:{" "}
                    <strong className="text-slate-900">
                      {typeof b.accept_credits_cost === "number"
                        ? `${b.accept_credits_cost} credits`
                        : "set on accept"}
                    </strong>
                  </span>
                  {b.provider_preference === "expert_team" &&
                    data.teams.length > 0 && (
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
                        {data.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
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
                  <span className="text-xs text-slate-500">
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

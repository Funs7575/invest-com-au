"use client";

/**
 * Open to Offers — consumer pitch inbox.
 *
 * Lists pending pitches with the pitching adviser's PUBLIC profile summary +
 * the pitch + their fee band. Accept → reveals contact and opens a brief chat
 * (redirects to the /briefs tracker the API returns). Decline → silent; the
 * adviser is refunded and auto-suppressed from re-pitching.
 */

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";

interface Adviser {
  id: number;
  name: string;
  slug: string | null;
  firmName: string | null;
  type: string | null;
  photoUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  verified: boolean;
  locationState: string | null;
}

interface Pitch {
  id: string;
  body: string;
  feeBand: string | null;
  createdAt: string;
  adviser: Adviser | null;
}

function typeLabel(t: string | null): string {
  if (!t) return "Adviser";
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PitchInbox() {
  const [pitches, setPitches] = useState<Pitch[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/open-to-offers/pitches");
      if (!res.ok) {
        setPitches([]);
        return;
      }
      const data = await res.json();
      setPitches((data.pitches ?? []) as Pitch[]);
    } catch {
      setPitches([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = useCallback(
    async (id: string, action: "accept" | "decline") => {
      setBusyId(id);
      setError(null);
      try {
        const res = await fetch(`/api/open-to-offers/pitches/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Could not complete that.");
          return;
        }
        if (action === "accept" && data.trackerUrl) {
          window.location.href = data.trackerUrl as string;
          return;
        }
        // Decline (or accept without a redirect) — drop the pitch from the list.
        setPitches((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  if (pitches === null) {
    return <p className="text-sm text-slate-400">Loading pitches…</p>;
  }

  if (pitches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <span className="mx-auto mb-2 inline-flex rounded-full bg-slate-100 p-2 text-slate-400">
          <Icon name="inbox" size={18} />
        </span>
        <p className="text-sm font-semibold text-slate-700">No pitches yet</p>
        <p className="mt-1 text-xs text-slate-500">
          When you&apos;re open to offers, vetted advisers can pitch you here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {pitches.map((p) => {
        const a = p.adviser;
        return (
          <article
            key={p.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {a?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small remote adviser avatar; arbitrary external host, not worth next/image domain config
                  <img src={a.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-slate-400">
                    <Icon name="user" size={18} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-sm font-bold text-slate-900">
                    {a?.name ?? "A vetted adviser"}
                  </p>
                  {a?.verified && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                      <Icon name="shield" size={10} /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {typeLabel(a?.type ?? null)}
                  {a?.firmName ? ` · ${a.firmName}` : ""}
                  {a?.locationState ? ` · ${a.locationState}` : ""}
                </p>
                {a && (a.rating ?? 0) > 0 && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                    <Icon name="star" size={11} />
                    {a.rating?.toFixed(1)}{" "}
                    <span className="text-slate-400">
                      ({a.reviewCount ?? 0} review{a.reviewCount === 1 ? "" : "s"})
                    </span>
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {p.body}
            </p>
            {p.feeBand && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-semibold">Their fee estimate:</span> {p.feeBand}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => decide(p.id, "accept")}
                disabled={busyId === p.id}
                aria-busy={busyId === p.id}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                Accept &amp; share my details
              </button>
              <button
                type="button"
                onClick={() => decide(p.id, "decline")}
                disabled={busyId === p.id}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-60"
              >
                Decline
              </button>
              {a?.slug && (
                <a
                  href={`/advisor/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  View profile
                </a>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Declining is silent — the adviser is never told who declined.
            </p>
          </article>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface AdviserSummary {
  name: string;
  slug: string | null;
  firmName: string | null;
  type: string | null;
  locationState: string | null;
  yearsExperience: number | null;
  verified: boolean;
}

interface OfferView {
  offerId: number;
  body: string;
  packageRateBand: string | null;
  status: string;
  adviser: AdviserSummary | null;
  createdAt: string;
}

export interface PoolPanelData {
  poolId: number;
  memberCount: number;
  status: string;
  offers: OfferView[];
  accepted: boolean;
}

function adviserTypeLabel(type: string | null): string {
  if (!type) return "Verified pro";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Consumer-side Group Briefs panel on the brief tracker. Shows the member's
 * pool status and any group offers; each offer can be individually accepted or
 * declined. Email-as-key: the verified owner's email is passed from the server
 * (the tracker only renders this for `emailMatches`). Compliance footer is
 * always present — factual, "general information only".
 */
export default function PoolOffersPanel({
  slug,
  email,
  data,
}: {
  slug: string;
  email: string;
  data: PoolPanelData;
}) {
  const [busy, setBusy] = useState<number | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { kind: "accept" | "decline" }>(null);

  const activeOffers = data.offers.filter((o) => o.status === "active");

  async function accept(offerId: number) {
    setBusy(offerId);
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${slug}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", email, offer_id: offerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not accept this offer");
      setDone({ kind: "accept" });
      // Reload so the tracker reflects the now-accepted brief (contact unlocked
      // + chat open).
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept this offer");
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    setBusy("decline");
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${slug}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not update");
      setDone({ kind: "decline" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(null);
    }
  }

  if (done?.kind === "decline") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          You&apos;ve left this group. You&apos;ll still be matched individually with
          verified pros for your request.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <Icon name="users" size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-violet-900">
            Your request is part of a group of {data.memberCount}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-violet-800">
            {activeOffers.length === 0
              ? "Advisers may make a group offer to everyone with a similar need this month. You'll be emailed the moment one arrives — and you decide individually whether to accept."
              : `${activeOffers.length} group offer${activeOffers.length === 1 ? "" : "s"} received. Each is the adviser's own package — accept the one that suits you, or decline. Your details stay private until you accept.`}
          </p>
        </div>
      </div>

      {data.accepted && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
          You accepted a group offer. Your chosen adviser now has your contact
          details — see the chat below to get started.
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {!data.accepted && activeOffers.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {activeOffers.map((offer) => (
            <li key={offer.offerId} className="rounded-xl border border-violet-200 bg-white p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {offer.adviser?.name ?? "A verified pro"}
                    {offer.adviser?.verified && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Icon name="check" size={9} /> Verified
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {adviserTypeLabel(offer.adviser?.type ?? null)}
                    {offer.adviser?.firmName ? ` · ${offer.adviser.firmName}` : ""}
                    {offer.adviser?.locationState ? ` · ${offer.adviser.locationState}` : ""}
                    {offer.adviser?.yearsExperience
                      ? ` · ${offer.adviser.yearsExperience}+ yrs`
                      : ""}
                  </p>
                </div>
                {offer.adviser?.slug && (
                  <Link
                    href={`/advisor/${offer.adviser.slug}`}
                    className="shrink-0 text-[11px] font-semibold text-violet-700 underline hover:text-violet-900"
                  >
                    View profile →
                  </Link>
                )}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {offer.body}
              </p>

              {offer.packageRateBand && (
                <p className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                  Package rate: {offer.packageRateBand}{" "}
                  <span className="font-normal text-slate-400">(adviser&apos;s own pricing)</span>
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => accept(offer.offerId)}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {busy === offer.offerId ? "Accepting…" : "Accept this offer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!data.accepted && (
        <div className="mt-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={decline}
            className="text-[11px] font-semibold text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
          >
            {busy === "decline" ? "Updating…" : "Leave this group"}
          </button>
        </div>
      )}

      <p className="mt-3 border-t border-violet-200 pt-2.5 text-[10.5px] leading-relaxed text-violet-700/80">
        General information only — not personal advice. A group offer is the
        adviser&apos;s own package and quoted pricing; Invest.com.au provides
        marketplace introductions and does not handle payments between you and the
        adviser. Each member decides individually — nothing is shared until you
        accept.
      </p>
    </section>
  );
}

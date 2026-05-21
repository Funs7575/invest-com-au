"use client";

import Link from "next/link";
import type { ScoredRound } from "@/lib/startup-match";
import { raisedPct, formatAud } from "@/lib/startup-match";

const INSTRUMENT_LABELS: Record<string, string> = {
  safe: "SAFE Note",
  convertible_note: "Convertible Note",
  equity: "Equity",
  revenue_share: "Revenue Share",
  debt: "Debt",
};

function InstrumentBadge({ instrument }: { instrument: string }) {
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
      {INSTRUMENT_LABELS[instrument] ?? instrument}
    </span>
  );
}

function EsicBadge() {
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
      ESIC eligible
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-violet-500 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RoundCard({ item }: { item: ScoredRound }) {
  const { round, profile } = item;
  const pct = raisedPct(round);
  const closesAt = round.closes_at
    ? new Date(round.closes_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Link
            href={`/invest/startups/listings/${profile.slug}`}
            className="text-base font-bold text-slate-900 hover:text-violet-700"
          >
            {profile.company_name}
          </Link>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <InstrumentBadge instrument={round.instrument} />
            {(profile.esic_eligible_self_attested || profile.esic_verified_at) && (
              <EsicBadge />
            )}
            {item.sectorMatches.length > 0 && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-medium">
                {item.sectorMatches.slice(0, 2).join(", ")} match
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-slate-900">
            {formatAud(round.target_aud_cents)}
          </div>
          <div className="text-xs text-slate-400">target</div>
        </div>
      </div>

      <ProgressBar pct={pct} />
      <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
        <span>{pct}% raised ({formatAud(round.raised_aud_cents)})</span>
        <span>Min {formatAud(round.min_ticket_aud_cents)}</span>
      </div>

      {closesAt && (
        <p className="mt-3 text-xs text-slate-500">
          Closes <span className="font-medium text-slate-700">{closesAt}</span>
        </p>
      )}

      <div className="mt-4">
        <Link
          href={`/invest/startups/listings/${profile.slug}`}
          className="text-sm font-semibold text-violet-700 hover:text-violet-900"
        >
          View round →
        </Link>
      </div>
    </article>
  );
}

interface Props {
  rounds: ScoredRound[];
  hasThesis: boolean;
  isWholesaleVerified: boolean;
}

export default function ForYouClient({ rounds, hasThesis, isWholesaleVerified }: Props) {
  if (!hasThesis) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 px-6 text-center">
        <div className="text-3xl mb-3">🎯</div>
        <h2 className="text-base font-bold text-slate-800 mb-1">No thesis set yet</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
          Tell us your sector focus, stage preferences, and ticket size to get personalised startup
          round recommendations.
        </p>
        <Link
          href="/account/startup-thesis"
          className="inline-block px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700"
        >
          Set investment thesis
        </Link>
        {rounds.length > 0 && (
          <p className="mt-4 text-xs text-slate-400">
            Showing all {rounds.length} open round{rounds.length !== 1 ? "s" : ""} below.
          </p>
        )}
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 px-6 text-center">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-bold text-slate-800 mb-1">No matching rounds right now</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
          No open rounds match your current thesis. Try broadening your sector or stage preferences,
          or check back soon as new rounds are added regularly.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/account/startup-thesis"
            className="inline-block px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700"
          >
            Update thesis
          </Link>
          <Link
            href="/invest/startups/listings"
            className="inline-block px-5 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Browse all listings
          </Link>
        </div>
        {!isWholesaleVerified && (
          <p className="mt-5 text-xs text-slate-400">
            Some rounds require wholesale investor certification.{" "}
            <Link href="/account/wholesale-cert" className="text-violet-600 hover:underline">
              Get certified
            </Link>{" "}
            to unlock them.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        {rounds.length} matching round{rounds.length !== 1 ? "s" : ""} — sorted by thesis fit.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rounds.map((item) => (
          <RoundCard key={item.round.id} item={item} />
        ))}
      </div>
      {!isWholesaleVerified && (
        <p className="mt-6 text-xs text-slate-400 text-center">
          Wholesale-only rounds are hidden.{" "}
          <Link href="/account/wholesale-cert" className="text-violet-600 hover:underline">
            Get s708 certified
          </Link>{" "}
          to see all opportunities.
        </p>
      )}
    </div>
  );
}

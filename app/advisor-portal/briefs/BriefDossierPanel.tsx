"use client";

/**
 * BriefDossierPanel — renders one brief's intelligence dossier inside the
 * adviser inbox: location context, "briefs like this" market stats, and
 * the adviser's own track record. Every section degrades to an honest
 * empty state; copy stays informational (never pressure mechanics) and
 * never references other advisers' identities or individual bids.
 */

import Icon from "@/components/Icon";
import type { BriefDossier } from "@/lib/brief-intel";
import { BUDGET_BAND_LABELS } from "@/lib/brief-intel-shared";

const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function formatHours(hours: number): string {
  if (hours < 1) return "under 1h";
  if (hours < 48) return `~${Math.round(hours)}h`;
  return `~${Math.round(hours / 24)} days`;
}

function formatPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

const QUALITY_STYLES: Record<string, string> = {
  weak: "bg-slate-100 text-slate-700",
  fair: "bg-amber-100 text-amber-800",
  good: "bg-emerald-100 text-emerald-800",
  great: "bg-emerald-100 text-emerald-800",
};

function SectionHeading({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
      <Icon name={icon} size={13} className="text-slate-400" aria-hidden />
      {children}
    </h4>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <dt className="inline font-semibold text-slate-600">{label}:</dt>{" "}
      <dd className="inline text-slate-800">{value}</dd>
    </div>
  );
}

export default function BriefDossierPanel({ dossier }: { dossier: BriefDossier }) {
  const { location, similar, trackRecord, quality, responseWindow } = dossier;

  const locationFacts: { label: string; value: string }[] = [];
  if (location) {
    if (location.medianHousePrice != null) {
      locationFacts.push({ label: "Median house", value: aud.format(location.medianHousePrice) });
    }
    if (location.medianUnitPrice != null) {
      locationFacts.push({ label: "Median unit", value: aud.format(location.medianUnitPrice) });
    }
    if (location.capitalGrowthPct != null && location.capitalGrowthWindow) {
      const windowLabel = { "5y": "5-yr", "3y": "3-yr", "1y": "1-yr" }[location.capitalGrowthWindow];
      locationFacts.push({ label: `${windowLabel} growth`, value: formatPct(location.capitalGrowthPct) });
    }
    if (location.rentalYieldHousePct != null) {
      locationFacts.push({ label: "House yield", value: `${location.rentalYieldHousePct.toFixed(1)}%` });
    } else if (location.rentalYieldUnitPct != null) {
      locationFacts.push({ label: "Unit yield", value: `${location.rentalYieldUnitPct.toFixed(1)}%` });
    }
    if (location.vacancyRatePct != null) {
      locationFacts.push({ label: "Vacancy", value: `${location.vacancyRatePct.toFixed(1)}%` });
    }
    if (location.distanceToCbdKm != null) {
      locationFacts.push({ label: "To CBD", value: `${location.distanceToCbdKm.toFixed(0)} km` });
    }
  }

  const locationName = location
    ? [location.suburb, location.state, location.postcode].filter(Boolean).join(" · ")
    : null;

  return (
    <div className="space-y-4">
      {/* Quality band + suggested response window */}
      <div className="flex flex-wrap items-center gap-2">
        {quality && (
          <span
            className={`inline-flex items-center gap-1 text-[0.7rem] font-bold px-2 py-0.5 rounded-full ${QUALITY_STYLES[quality.tier] ?? "bg-slate-100 text-slate-700"}`}
          >
            <Icon name="file-text" size={11} aria-hidden />
            Brief detail: {quality.label}
          </span>
        )}
        {responseWindow && (
          <span className="text-xs text-slate-600">
            Similar briefs are typically accepted within{" "}
            <strong className="text-slate-900">
              {formatHours(responseWindow.medianHoursToAccept)}
            </strong>{" "}
            of posting — responding within {responseWindow.windowHours}h keeps you in the
            early group.
          </span>
        )}
      </div>

      {/* Location context */}
      <section aria-label="Location context">
        <SectionHeading icon="map-pin">Location signal</SectionHeading>
        {location && (locationFacts.length > 0 || locationName) ? (
          <>
            {locationName && (
              <p className="text-xs font-semibold text-slate-800 mb-1">{locationName}</p>
            )}
            {locationFacts.length > 0 ? (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {locationFacts.map((f) => (
                  <Fact key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">
                No suburb-level market data for this location yet
                {location.state ? ` — state-level only (${location.state}).` : "."}
              </p>
            )}
            {location.localities.length > 1 && location.postcode && (
              <p className="text-[0.7rem] text-slate-500 mt-1">
                Postcode {location.postcode} also covers {location.localities.slice(0, 4).join(", ")}
                {location.localities.length > 4 ? "…" : ""}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">
            No location details on this brief — ask about the target area after accepting.
          </p>
        )}
      </section>

      {/* Similar-brief market stats */}
      <section aria-label="Similar briefs">
        <SectionHeading icon="bar-chart-2">Briefs like this</SectionHeading>
        {similar ? (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              {similar.medianHoursToAccept != null && (
                <Fact label="Median time to accept" value={formatHours(similar.medianHoursToAccept)} />
              )}
              <Fact label="Accept rate" value={`${similar.acceptRatePct}%`} />
              {similar.typicalAcceptedBudgetBand && (
                <Fact
                  label="Typical accepted budget"
                  value={
                    BUDGET_BAND_LABELS[similar.typicalAcceptedBudgetBand] ??
                    similar.typicalAcceptedBudgetBand
                  }
                />
              )}
            </dl>
            <p className="text-[0.7rem] text-slate-500 mt-1">
              Based on {similar.sampleSize} {similar.templateLabel.toLowerCase()} briefs
              {similar.scope === "state" && similar.state
                ? ` in ${similar.state}`
                : " Australia-wide"}{" "}
              over the last {Math.round(similar.windowDays / 30)} months.
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Not enough history on similar briefs yet — market stats appear once at least 5
            comparable briefs have run.
          </p>
        )}
      </section>

      {/* Adviser's own track record */}
      <section aria-label="Your track record">
        <SectionHeading icon="trending-up">Your track record here</SectionHeading>
        {trackRecord &&
        (trackRecord.categoryBidCount > 0 || trackRecord.acceptedSimilarCount > 0) ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {trackRecord.categoryWinRatePct != null ? (
              <Fact
                label="Your win rate in this category"
                value={`${trackRecord.categoryWinRatePct}% of ${trackRecord.decidedBidCount} decided quotes`}
              />
            ) : (
              trackRecord.categoryBidCount > 0 && (
                <div className="text-xs col-span-2 sm:col-span-3 text-slate-500">
                  {trackRecord.categoryBidCount} recent{" "}
                  {trackRecord.categoryBidCount === 1 ? "quote" : "quotes"} in this category —
                  your win rate unlocks after 3 decided quotes.
                </div>
              )
            )}
            {trackRecord.acceptedSimilarCount > 0 && (
              <Fact
                label="Similar briefs accepted"
                value={`${trackRecord.acceptedSimilarCount}${
                  trackRecord.engagedSimilarCount > 0
                    ? ` (${trackRecord.engagedSimilarCount} became clients)`
                    : ""
                }`}
              />
            )}
          </dl>
        ) : (
          <p className="text-xs text-slate-500">
            No history with this brief type yet — your stats build as you quote and accept.
          </p>
        )}
      </section>

      <p className="text-[0.65rem] text-slate-400 leading-relaxed">
        Aggregated, anonymised marketplace history. Individual bids and adviser identities are
        never shown. Suburb figures from invest.com.au research data
        {location?.dataDate ? ` (as at ${new Date(location.dataDate).toLocaleDateString("en-AU", { month: "short", year: "numeric" })})` : ""}; informational only, not advice.
      </p>
    </div>
  );
}

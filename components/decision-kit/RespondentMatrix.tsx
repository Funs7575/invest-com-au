"use client";

import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import type { RespondentRow } from "@/lib/decision-kit/respondents";
import {
  formatAmount,
  responseSpeedLabel,
  prettyType,
  offersRemote,
} from "./format";

/**
 * Respondent comparison matrix — side-by-side, factual cards for each adviser
 * who responded. Every metric renders only when the underlying signal exists;
 * gaps are shown honestly. This is a factual comparison, NOT a ranking — no
 * "best" badge, no verdict, no ordering claim beyond what the caller passes in.
 */

interface Props {
  respondents: RespondentRow[];
  /** Surface label for copy ("quote" vs "response"). */
  amountLabel?: string;
}

function MetricRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 py-1.5 text-xs first:border-t-0">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

const GAP = <span className="text-slate-400">Not shown</span>;

function trustToneClass(score: number): string {
  if (score >= 70) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

export default function RespondentMatrix({ respondents, amountLabel = "Quote" }: Props) {
  if (respondents.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        role="list"
        aria-label="Responding advisers, side by side"
      >
        {respondents.map((r) => {
          const amount = formatAmount(r.amountCents);
          const speed = responseSpeedLabel(r.responseTime);
          const type = prettyType(r.type);
          const remote = offersRemote(r.meetingTypes);
          return (
            <div
              key={r.professionalId}
              role="listitem"
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4"
            >
              {/* Header: photo + name + firm */}
              <div className="mb-3 flex items-center gap-3">
                {r.photoUrl ? (
                  <Image
                    src={r.photoUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                    <Icon name="user-check" size={18} className="text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-bold text-slate-900">
                    {r.slug ? (
                      <Link
                        href={`/advisor/${r.slug}`}
                        className="truncate hover:text-amber-700 hover:underline"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      <span className="truncate">{r.name}</span>
                    )}
                    {r.verified && (
                      <Icon
                        name="shield-check"
                        size={14}
                        className="shrink-0 text-emerald-600"
                        aria-label="Verified"
                      />
                    )}
                  </p>
                  {r.firmName && (
                    <p className="truncate text-xs text-slate-500">{r.firmName}</p>
                  )}
                </div>
              </div>

              {/* Headline amount */}
              <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-center">
                {amount ? (
                  <>
                    <p className="text-xl font-extrabold text-slate-900">{amount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      {amountLabel}
                    </p>
                  </>
                ) : (
                  <p className="py-1 text-xs text-slate-500">No {amountLabel.toLowerCase()} provided</p>
                )}
              </div>

              {/* Metrics */}
              <dl className="flex-1">
                <MetricRow label="Trust score">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${trustToneClass(
                      r.trust.overall,
                    )}`}
                    title="Factual composite of verification, tenure, profile completeness and reviews"
                  >
                    {r.trust.overall}/100 · {r.trust.label}
                  </span>
                </MetricRow>

                <MetricRow label="Responds">{speed ?? GAP}</MetricRow>

                <MetricRow label="Verified outcomes">
                  {r.outcome && r.outcome.completion_rate_pct != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="thumbs-up" size={12} className="text-emerald-600" />
                      {r.outcome.completion_rate_pct}% completed
                      <span className="text-slate-400">
                        ({r.outcome.outcomes_submitted})
                      </span>
                    </span>
                  ) : (
                    GAP
                  )}
                </MetricRow>

                <MetricRow label="Type">{type ?? GAP}</MetricRow>

                <MetricRow label="Location">
                  {r.locationDisplay ?? GAP}
                  {remote && (
                    <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      Remote ok
                    </span>
                  )}
                </MetricRow>

                {r.specialties.length > 0 && (
                  <div className="border-t border-slate-100 py-1.5">
                    <dt className="mb-1 text-xs text-slate-500">Specialties</dt>
                    <dd className="flex flex-wrap gap-1">
                      {r.specialties.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {s}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Booking tie-in — booking_link-aware: when the adviser exposes
                  a direct calendar (Calendly/Cal.com), link straight to it
                  (external, new tab) matching the shortlist/BookingWidget
                  convention; otherwise fall back to the profile #book anchor. */}
              <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                {r.bookingLink ? (
                  <a
                    href={r.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-amber-400"
                  >
                    Book an intro call
                    <Icon name="arrow-right" size={12} />
                  </a>
                ) : r.slug ? (
                  <Link
                    href={`/advisor/${r.slug}#book`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-amber-400"
                  >
                    {r.bookingEnabled ? "Book an intro call" : "View profile & contact"}
                    <Icon name="arrow-right" size={12} />
                  </Link>
                ) : null}
                {!r.acceptingNewClients && (
                  <p className="text-center text-[10px] text-slate-400">
                    May not be taking new clients right now
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

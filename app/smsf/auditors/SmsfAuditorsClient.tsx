"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export interface AuditorRow {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  location_state: string | null;
  location_display: string | null;
  bio: string | null;
  fee_structure: string | null;
  fee_description: string | null;
  verified: boolean | null;
  rating: number | string | null;
  review_count: number | null;
  hourly_rate_cents: number | null;
  flat_fee_cents: number | null;
  specialties: string[] | null;
  registration_number: string | null;
}

const AU_STATES = ["All states", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const FEE_BANDS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $500", min: 0, max: 50000 },
  { label: "$500 – $1,000", min: 50000, max: 100000 },
  { label: "$1,000 – $2,000", min: 100000, max: 200000 },
  { label: "$2,000+", min: 200000, max: Infinity },
];

function formatCents(cents: number | null): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export default function SmsfAuditorsClient({
  auditors,
}: {
  auditors: AuditorRow[];
}) {
  const [state, setState] = useState("All states");
  const [feeBand, setFeeBand] = useState(0);

  const filtered = useMemo(() => {
    const band = FEE_BANDS[feeBand]!;
    return auditors.filter((a) => {
      if (state !== "All states" && a.location_state !== state) return false;
      const fee = a.flat_fee_cents ?? a.hourly_rate_cents ?? null;
      if (band.max !== Infinity || band.min !== 0) {
        if (fee == null) return false;
        if (fee < band.min || fee > band.max) return false;
      }
      return true;
    });
  }, [auditors, state, feeBand]);

  return (
    <>
      <section className="bg-slate-50 border-b border-slate-200 py-5">
        <div className="container-custom">
          <div className="flex flex-wrap items-end gap-3 md:gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Location
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Fee range
              </label>
              <select
                value={feeBand}
                onChange={(e) => setFeeBand(parseInt(e.target.value, 10))}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {FEE_BANDS.map((b, i) => (
                  <option key={b.label} value={i}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 text-right text-xs text-slate-500">
              {filtered.length} {filtered.length === 1 ? "auditor" : "auditors"}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container-custom">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-500 mb-3">
                No auditors match these filters yet. Try widening the state or
                fee range.
              </p>
              <Link
                href="/advisor-apply?type=smsf_auditor"
                className="text-sm font-bold text-amber-600 hover:underline"
              >
                Are you an SMSF auditor? Apply to be listed →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((a) => (
                <AuditorCard key={a.id} auditor={a} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function AuditorCard({ auditor }: { auditor: AuditorRow }) {
  const fee = formatCents(auditor.flat_fee_cents);
  const hourly = formatCents(auditor.hourly_rate_cents);
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
            {auditor.name}
          </h3>
          {auditor.firm_name && (
            <p className="text-xs text-slate-500 mt-0.5">{auditor.firm_name}</p>
          )}
        </div>
        {auditor.verified && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
            Verified
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 mb-3">
        {auditor.location_display && (
          <span className="inline-flex items-center gap-1">
            <Icon name="map-pin" size={11} />
            {auditor.location_display}
          </span>
        )}
        {auditor.registration_number && (
          <span className="inline-flex items-center gap-1">
            <Icon name="shield-check" size={11} />
            SAN: {auditor.registration_number}
          </span>
        )}
      </div>

      {auditor.bio && (
        <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
          {auditor.bio}
        </p>
      )}

      {(fee || hourly) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {fee && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
              Flat fee: {fee}
            </span>
          )}
          {hourly && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
              Hourly: {hourly}
            </span>
          )}
        </div>
      )}

      <Link
        href={`/advisor/${auditor.slug}?source=smsf-auditors`}
        className="inline-flex items-center justify-center gap-1.5 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        Get a Quote
        <Icon name="arrow-right" size={14} />
      </Link>
    </article>
  );
}

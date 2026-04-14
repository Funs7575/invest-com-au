"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Side-by-side comparison of up to 4 advisors.
 *
 * Feature matrix rows:
 *   - photo + name + firm
 *   - rating + review_count
 *   - location
 *   - specialties (chip cloud)
 *   - verified
 *   - response time (median)
 *   - lead acceptance %
 *   - bio excerpt
 *   - CTA to the full profile + enquire
 *
 * Pure display — no DB access. Parent page supplies the advisor
 * rows from `professionals` table.
 */

export interface AdvisorCompareRow {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  photo_url: string | null;
  type: string | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  location_display: string | null;
  median_response_hours: number | null;
  advisor_tier: string | null;
  specialties: string[] | null;
  bio: string | null;
}

interface Props {
  advisors: AdvisorCompareRow[];
  onRemove?: (id: number) => void;
}

export default function AdvisorCompareMatrix({ advisors, onRemove }: Props) {
  if (advisors.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        <p>No advisors selected. Add some from the{" "}
          <Link href="/find-advisor" className="underline hover:text-slate-900">
            advisor directory
          </Link>{" "}
          to compare them side-by-side.</p>
      </div>
    );
  }

  // Collect all unique specialties so the specialty row can show a
  // tick-grid of which advisor covers which area.
  const allSpecialties = Array.from(
    new Set(
      advisors.flatMap((a) => a.specialties || []).map((s) => s.toLowerCase()),
    ),
  ).sort();

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100 w-48">
              &nbsp;
            </th>
            {advisors.map((a) => (
              <th
                key={a.id}
                className="px-4 py-3 text-left border-b border-slate-100 min-w-[200px] relative"
              >
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    aria-label={`Remove ${a.name} from comparison`}
                    className="absolute top-1 right-1 text-slate-400 hover:text-slate-600 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
                <div className="flex flex-col items-center text-center">
                  {a.photo_url ? (
                    <Image
                      src={a.photo_url}
                      alt={a.name}
                      width={64}
                      height={64}
                      className="rounded-full mb-2 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 mb-2 flex items-center justify-center text-slate-500 text-xl">
                      {a.name.charAt(0)}
                    </div>
                  )}
                  <div className="text-sm font-bold text-slate-900 leading-tight">
                    {a.name}
                  </div>
                  {a.firm_name && (
                    <div className="text-[0.65rem] text-slate-500 mt-0.5">
                      {a.firm_name}
                    </div>
                  )}
                  {a.advisor_tier && a.advisor_tier !== "free" && (
                    <span className="mt-1 text-[0.55rem] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {a.advisor_tier}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="Rating">
            {advisors.map((a) => (
              <Cell key={a.id}>
                {a.rating ? (
                  <>
                    <span className="font-bold text-slate-900">{a.rating.toFixed(1)}</span>
                    <span className="text-slate-400 text-[0.65rem]"> /5</span>
                    {a.review_count != null && (
                      <div className="text-[0.6rem] text-slate-500">
                        {a.review_count} review{a.review_count === 1 ? "" : "s"}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Cell>
            ))}
          </Row>

          <Row label="Verified">
            {advisors.map((a) => (
              <Cell key={a.id}>
                {a.verified ? (
                  <span className="text-emerald-600 font-bold" aria-label="Yes">✓</span>
                ) : (
                  <span className="text-slate-300" aria-label="No">—</span>
                )}
              </Cell>
            ))}
          </Row>

          <Row label="Location">
            {advisors.map((a) => (
              <Cell key={a.id}>
                {a.location_display || <span className="text-slate-400">—</span>}
              </Cell>
            ))}
          </Row>

          <Row label="Response time">
            {advisors.map((a) => (
              <Cell key={a.id}>
                {a.median_response_hours != null ? (
                  a.median_response_hours <= 2 ? (
                    <span className="text-emerald-700 font-semibold">≤ 2 hours</span>
                  ) : a.median_response_hours <= 24 ? (
                    <span className="text-amber-700 font-semibold">&lt; 24 hours</span>
                  ) : (
                    <span className="text-slate-600">
                      ~{Math.round(a.median_response_hours / 24)} days
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Cell>
            ))}
          </Row>

          <Row label="Type">
            {advisors.map((a) => (
              <Cell key={a.id}>
                {a.type || <span className="text-slate-400">—</span>}
              </Cell>
            ))}
          </Row>

          {allSpecialties.length > 0 &&
            allSpecialties.map((spec) => (
              <Row key={spec} label={specialtyLabel(spec)} small>
                {advisors.map((a) => {
                  const has = (a.specialties || []).some(
                    (s) => s.toLowerCase() === spec,
                  );
                  return (
                    <Cell key={a.id}>
                      {has ? (
                        <span className="text-emerald-600 font-bold" aria-label="Yes">✓</span>
                      ) : (
                        <span className="text-slate-300" aria-label="No">—</span>
                      )}
                    </Cell>
                  );
                })}
              </Row>
            ))}

          <Row label="Bio">
            {advisors.map((a) => (
              <Cell key={a.id}>
                <span className="text-[0.7rem] text-slate-600 line-clamp-4">
                  {a.bio || <span className="text-slate-400">—</span>}
                </span>
              </Cell>
            ))}
          </Row>

          <tr>
            <td className="sticky left-0 bg-white z-10 px-4 py-3 border-t border-slate-100">
              &nbsp;
            </td>
            {advisors.map((a) => (
              <td key={a.id} className="px-4 py-3 border-t border-slate-100">
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/advisor/${a.slug}`}
                    className="block w-full text-center px-3 py-2 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    View profile
                  </Link>
                  <Link
                    href={`/advisor/${a.slug}?enquire=1`}
                    className="block w-full text-center px-3 py-2 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Enquire
                  </Link>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  children,
  small = false,
}: {
  label: string;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <tr className="border-b border-slate-100">
      <th
        scope="row"
        className={`sticky left-0 bg-white z-10 px-4 py-3 text-left font-semibold text-slate-700 ${
          small ? "text-[0.65rem] font-normal text-slate-500" : "text-xs"
        }`}
      >
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-xs text-slate-700 align-top">{children}</td>;
}

function specialtyLabel(spec: string): string {
  return spec
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

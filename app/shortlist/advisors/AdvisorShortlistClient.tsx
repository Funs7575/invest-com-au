"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdvisorShortlist } from "@/lib/hooks/useAdvisorShortlist";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import Icon from "@/components/Icon";

interface AdvisorData {
  id: number;
  slug: string;
  name: string;
  firm_name?: string;
  type: string;
  photo_url?: string;
  rating: number;
  review_count: number;
  verified: boolean;
  location_display?: string;
  specialties: string[];
  fee_structure?: string;
  fee_description?: string;
  hourly_rate_cents?: number;
  flat_fee_cents?: number;
  aum_percentage?: number;
  initial_consultation_free?: boolean;
  bio?: string;
  booking_link?: string;
}

function formatFee(a: AdvisorData): string {
  if (a.initial_consultation_free) return "Free initial consult";
  if (a.hourly_rate_cents) return `$${(a.hourly_rate_cents / 100).toLocaleString()}/hr`;
  if (a.flat_fee_cents) return `$${(a.flat_fee_cents / 100).toLocaleString()} flat fee`;
  if (a.aum_percentage) return `${a.aum_percentage}% AUM`;
  if (a.fee_description) return a.fee_description.slice(0, 50);
  if (a.fee_structure) return a.fee_structure;
  return "Contact for fees";
}

export default function AdvisorShortlistClient() {
  const { slugs, count, toggle, clear, max } = useAdvisorShortlist();
  const [advisors, setAdvisors] = useState<AdvisorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setAdvisors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = slugs.map((s) => `slugs=${encodeURIComponent(s)}`).join("&");
    fetch(`/api/advisor-compare?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAdvisors(data.advisors || []);
      })
      .catch(() => setAdvisors([]))
      .finally(() => setLoading(false));
  }, [slugs]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="bookmark" size={28} className="text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">No advisors saved yet</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
          Browse the directory and tap the bookmark icon to save advisors you&apos;re interested in.
        </p>
        <Link
          href="/advisors"
          className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <Icon name="search" size={15} />
          Browse Advisors
        </Link>
      </div>
    );
  }

  const compareUrl = `/advisors/compare?${slugs.map((s) => `slugs=${encodeURIComponent(s)}`).join("&")}`;

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600 font-medium">
          {count} of {max} saved
        </p>
        <div className="flex items-center gap-2">
          {count >= 2 && (
            <Link
              href={compareUrl}
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Icon name="columns" size={13} />
              Compare All
            </Link>
          )}
          <button
            onClick={clear}
            className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Advisor cards */}
      <div className="space-y-3 mb-6">
        {advisors.map((a) => (
          <div
            key={a.slug}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4"
          >
            {/* Photo */}
            <div className="shrink-0">
              {a.photo_url ? (
                <Image
                  src={a.photo_url}
                  alt={a.name}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
                  <Icon name="user" size={24} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/advisor/${a.slug}`}
                      className="text-sm font-bold text-slate-900 hover:text-violet-700 transition-colors"
                    >
                      {a.name}
                    </Link>
                    {a.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <Icon name="check-circle" size={10} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {PROFESSIONAL_TYPE_LABELS[a.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || a.type}
                    {a.firm_name && ` · ${a.firm_name}`}
                    {a.location_display && ` · ${a.location_display}`}
                  </p>
                </div>
                {/* Remove button */}
                <button
                  onClick={() => toggle(a.slug)}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                  title="Remove from saved"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {a.rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <span className="text-amber-400">{"★".repeat(Math.round(a.rating))}</span>
                    <span className="font-semibold">{a.rating.toFixed(1)}</span>
                    <span className="text-slate-400">({a.review_count})</span>
                  </span>
                )}
                <span className="text-xs text-slate-500">{formatFee(a)}</span>
                {a.specialties?.slice(0, 2).map((s) => (
                  <span key={s} className="text-[0.6rem] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex flex-col gap-1.5 items-end">
              <Link
                href={`/advisor/${a.slug}`}
                className="text-xs font-semibold text-violet-700 hover:text-violet-900 px-2.5 py-1.5 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors whitespace-nowrap"
              >
                View profile
              </Link>
              {a.booking_link && (
                <a
                  href={a.booking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2.5 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors whitespace-nowrap"
                >
                  Book now
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-800">Not sure who to pick?</p>
          <p className="text-xs text-slate-500 mt-0.5">Answer 3 questions and we&apos;ll match you to the right advisor.</p>
        </div>
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors whitespace-nowrap"
        >
          <Icon name="zap" size={14} />
          Get matched
        </Link>
      </div>

      {/* Add more */}
      {count < max && (
        <p className="text-center text-xs text-slate-400 mt-4">
          You can save {max - count} more advisor{max - count !== 1 ? "s" : ""}.{" "}
          <Link href="/advisors" className="text-violet-600 hover:underline">Browse the directory →</Link>
        </p>
      )}
    </div>
  );
}

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
  afsl_number?: string;
  bio?: string;
  booking_link?: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
    </span>
  );
}

function formatFee(a: AdvisorData): string {
  if (a.hourly_rate_cents) return `$${(a.hourly_rate_cents / 100).toLocaleString()}/hr`;
  if (a.flat_fee_cents) return `$${(a.flat_fee_cents / 100).toLocaleString()} flat fee`;
  if (a.aum_percentage) return `${a.aum_percentage}% AUM`;
  if (a.fee_description) return a.fee_description.slice(0, 40);
  if (a.fee_structure) return a.fee_structure;
  return "Not disclosed";
}

const COMPARE_ROWS: { label: string; render: (a: AdvisorData) => React.ReactNode }[] = [
  {
    label: "Rating",
    render: (a) =>
      a.rating > 0 ? (
        <span className="flex items-center gap-1.5 flex-wrap">
          <Stars rating={a.rating} />
          <span className="font-semibold text-slate-800">{a.rating.toFixed(1)}</span>
          <span className="text-slate-400 text-xs">({a.review_count})</span>
        </span>
      ) : (
        <span className="text-slate-400 text-xs">No reviews yet</span>
      ),
  },
  {
    label: "Verified",
    render: (a) =>
      a.verified ? (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
          <Icon name="check-circle" size={13} /> Verified
        </span>
      ) : (
        <span className="text-slate-400 text-xs">Unverified</span>
      ),
  },
  {
    label: "Specialty",
    render: (a) =>
      a.type ? (
        <span className="text-slate-700 text-sm font-medium">
          {PROFESSIONAL_TYPE_LABELS[a.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || a.type}
        </span>
      ) : (
        <span className="text-slate-400 text-xs">—</span>
      ),
  },
  {
    label: "Location",
    render: (a) =>
      a.location_display ? (
        <span className="text-slate-600 text-sm">{a.location_display}</span>
      ) : (
        <span className="text-slate-400 text-xs">—</span>
      ),
  },
  {
    label: "Fees",
    render: (a) => <span className="text-slate-700 text-sm">{formatFee(a)}</span>,
  },
  {
    label: "Free Consultation",
    render: (a) =>
      a.initial_consultation_free ? (
        <span className="text-emerald-700 font-semibold text-xs">Yes — Free initial consult</span>
      ) : (
        <span className="text-slate-400 text-xs">Paid</span>
      ),
  },
  {
    label: "AFSL",
    render: (a) =>
      a.afsl_number ? (
        <span className="text-slate-700 text-sm font-mono">{a.afsl_number}</span>
      ) : (
        <span className="text-slate-400 text-xs">Not listed</span>
      ),
  },
  {
    label: "Specialties",
    render: (a) =>
      a.specialties?.length ? (
        <div className="flex flex-wrap gap-1">
          {a.specialties.slice(0, 3).map((s) => (
            <span key={s} className="text-[0.6rem] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full border border-violet-100">
              {s}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-slate-400 text-xs">—</span>
      ),
  },
  {
    label: "Online Booking",
    render: (a) =>
      a.booking_link ? (
        <span className="text-emerald-700 font-semibold text-xs">Available</span>
      ) : (
        <span className="text-slate-400 text-xs">Enquiry only</span>
      ),
  },
];

export default function AdvisorCompareClient() {
  const { slugs, toggle, clear } = useAdvisorShortlist();
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
        if (Array.isArray(data.advisors)) setAdvisors(data.advisors);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slugs]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (slugs.length === 0) {
    return (
      <div className="text-center py-20">
        <Icon name="bookmark" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">No advisors saved</h1>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
          Browse advisors and tap the bookmark icon to save up to 4 for side-by-side comparison.
        </p>
        <Link
          href="/advisors"
          className="inline-block px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
        >
          Browse Advisors
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Compare Advisors</h1>
          <p className="text-sm text-slate-500 mt-1">{advisors.length} advisor{advisors.length !== 1 ? "s" : ""} saved for comparison</p>
        </div>
        <button
          onClick={clear}
          className="text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Advisor header cards */}
      <div className="grid gap-4 mb-0" style={{ gridTemplateColumns: `160px repeat(${advisors.length}, 1fr)` }}>
        {/* Empty label column */}
        <div />
        {advisors.map((a) => (
          <div key={a.slug} className="bg-white border border-slate-200 rounded-2xl p-4 text-center relative">
            <button
              onClick={() => toggle(a.slug)}
              className="absolute top-2 right-2 text-slate-300 hover:text-red-400 transition-colors"
              title="Remove from comparison"
            >
              <Icon name="x" size={14} />
            </button>
            {a.photo_url ? (
              <Image
                src={a.photo_url}
                alt={a.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-2xl font-bold text-violet-600 mx-auto mb-2">
                {a.name.charAt(0)}
              </div>
            )}
            <p className="font-bold text-slate-900 text-sm leading-tight">{a.name}</p>
            {a.firm_name && <p className="text-xs text-slate-500 mt-0.5">{a.firm_name}</p>}
            <div className="mt-3 space-y-1.5">
              <Link
                href={`/advisor/${a.slug}`}
                className="block w-full py-2 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                View Profile
              </Link>
              <a
                href={`/advisor/${a.slug}#contact`}
                className="block w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Request Consult
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
        {COMPARE_ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid items-center min-h-[52px] ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
            style={{ gridTemplateColumns: `160px repeat(${advisors.length}, 1fr)` }}
          >
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-100">
              {row.label}
            </div>
            {advisors.map((a) => (
              <div key={a.slug} className="px-4 py-3 border-r border-slate-100 last:border-r-0">
                {row.render(a)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add more prompt */}
      {advisors.length < 4 && (
        <div className="mt-6 text-center">
          <Link
            href="/advisors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            <Icon name="plus-circle" size={16} />
            Add another advisor to compare
          </Link>
        </div>
      )}
    </div>
  );
}

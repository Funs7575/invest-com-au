"use client";

import DirectoryGrid, { DEFAULT_FEE_BANDS, type DirectoryItem } from "@/components/DirectoryGrid";
import type { FilterConfig } from "@/components/DirectoryFilter";
import Link from "next/link";

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

function formatCents(cents: number | null): string | null {
  if (cents == null) return null;
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function auditorToItem(a: AuditorRow): DirectoryItem {
  const feeLabels: string[] = [];
  const flatFormatted = formatCents(a.flat_fee_cents);
  const hourlyFormatted = formatCents(a.hourly_rate_cents);
  if (flatFormatted) feeLabels.push(`Flat fee: ${flatFormatted}`);
  if (hourlyFormatted) feeLabels.push(`Hourly: ${hourlyFormatted}`);

  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    subtitle: a.firm_name,
    locationState: a.location_state,
    locationDisplay: a.location_display,
    bio: a.bio,
    isVerified: a.verified,
    registrationBadge: a.registration_number ? `SAN: ${a.registration_number}` : null,
    feeCents: a.flat_fee_cents ?? a.hourly_rate_cents,
    feeLabels,
    ctaHref: `/advisor/${a.slug}?source=smsf-auditors`,
    ctaLabel: "Get a Quote",
  };
}

const FILTERS: FilterConfig[] = [
  { type: "state" },
  { type: "fee-band", bands: DEFAULT_FEE_BANDS },
];

export default function SmsfAuditorsClient({ auditors }: { auditors: AuditorRow[] }) {
  const items = auditors.map(auditorToItem);

  return (
    <DirectoryGrid
      items={items}
      filters={FILTERS}
      noun="auditor"
      emptyState={
        <div className="py-20 text-center">
          <p className="text-sm text-slate-500 mb-3">
            No auditors match these filters yet. Try widening the state or fee range.
          </p>
          <Link
            href="/advisor-apply?type=smsf_auditor"
            className="text-sm font-bold text-amber-600 hover:underline"
          >
            Are you an SMSF auditor? Apply to be listed →
          </Link>
        </div>
      }
    />
  );
}

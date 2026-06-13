"use client";

/* eslint-disable react-hooks/set-state-in-effect -- post-mount fetch + shortlist hydrate inherently uses setState in an effect. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { InvestmentListing } from "@/lib/types";
import { listingUrl } from "@/lib/listing-url";
import { getListingHeroImage } from "@/lib/listing-vertical-images";
import {
  deriveListingKind,
  listingKindMeta,
  formatListingPrice,
} from "@/lib/listing-kind";
import { useListingShortlist } from "@/lib/hooks/useListingShortlist";
import { categoryForListing } from "@/lib/listing-url";
import {
  metricsForCategory,
  formatMetricByDef,
  pricePerUnit,
  type VerticalMetricDef,
} from "@/lib/listings/vertical-metrics";
import { buildLotProfile } from "@/lib/listings/lot-profile";
import { assessLotTransparency, transparencyLevelLabel } from "@/lib/listings/lot-transparency";
import Icon from "@/components/Icon";

/**
 * Client side of /invest/compare. Two modes:
 *
 *   - URL-seeded: page.tsx fetched the listings on the server (visitor
 *     followed a share-link with ?ids=foo,bar). We render those rows
 *     immediately and hydrate the shortlist to match for consistency.
 *
 *   - Shortlist-seeded: the user landed here from the sticky compare
 *     bar. URL has no ?ids. We read the shortlist on the client and
 *     fetch the matching listings via /api/listings/by-slugs (defined
 *     below) so we don't re-render with empty state.
 */

interface Props {
  initialListings: InvestmentListing[];
  initialSlugs: string[];
}

export default function InvestCompareClient({ initialListings, initialSlugs }: Props) {
  const { slugs: shortlistSlugs, toggle } = useListingShortlist();
  const [listings, setListings] = useState<InvestmentListing[]>(initialListings);
  const [loading, setLoading] = useState(false);
  const [needsFetch, setNeedsFetch] = useState(initialSlugs.length === 0);

  // When the URL had no ?ids, fetch listings matching the shortlist.
  useEffect(() => {
    if (!needsFetch) return;
    if (shortlistSlugs.length === 0) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/listings/by-slugs?slugs=${encodeURIComponent(shortlistSlugs.join(","))}`)
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((data) => {
        if (cancelled) return;
        const order = new Map(shortlistSlugs.map((s, i) => [s, i] as const));
        const next = ((data.listings ?? []) as InvestmentListing[]).sort(
          (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
        );
        setListings(next);
      })
      .catch(() => { /* fall through to empty state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [needsFetch, shortlistSlugs]);

  // Empty state
  if (listings.length === 0) {
    if (loading) {
      return <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />;
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <Icon name="bookmark" size={32} className="text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Nothing to compare yet</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
          Save 2–4 listings from the marketplace using the bookmark icon. Then come back here.
        </p>
        <Link
          href="/invest"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm"
        >
          Browse marketplace
        </Link>
      </div>
    );
  }

  return (
    <CompareTable listings={listings} onRemove={(slug) => {
      toggle(slug);
      setListings((prev) => prev.filter((l) => l.slug !== slug));
      // Force the next URL-less load to re-read shortlist
      setNeedsFetch(true);
    }} />
  );
}

// ─── The comparison table itself ──────────────────────────────────────

function CompareTable({ listings, onRemove }: { listings: InvestmentListing[]; onRemove: (slug: string) => void }) {
  // Compute all key_metrics keys that appear across the compared
  // listings — we'll show a row per key, filling in "—" for the
  // listings that don't have that metric. Limits to 14 most-common
  // keys to keep the table tidy.
  // First-class spec rows from the per-vertical registry (#7): union of
  // the compared listings' categories, in registry order, properly
  // labelled + formatted. The generic frequency rows below become the
  // long-tail fallback only.
  const registryDefs = useMemo(() => {
    const seen = new Map<string, VerticalMetricDef>();
    for (const l of listings) {
      for (const def of metricsForCategory(categoryForListing(l))) {
        if (!seen.has(def.key)) seen.set(def.key, def);
      }
    }
    return Array.from(seen.values());
  }, [listings]);

  const allMetricKeys = useMemo(() => {
    const registryKeys = new Set(registryDefs.map((d) => d.key));
    const counts = new Map<string, number>();
    for (const l of listings) {
      const km = (l.key_metrics ?? {}) as Record<string, unknown>;
      for (const k of Object.keys(km)) {
        if (registryKeys.has(k)) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([k]) => k);
  }, [listings, registryDefs]);

  const rows: Array<{ label: string; render: (l: InvestmentListing) => React.ReactNode }> = [
    {
      label: "Kind",
      render: (l) => {
        const meta = listingKindMeta(deriveListingKind(l));
        return (
          <span className={`inline-flex items-center gap-1 ${meta.accent.badgeSubtle} text-[0.6rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border`}>
            <Icon name={meta.icon} size={9} />
            {meta.label}
          </span>
        );
      },
    },
    {
      label: "Asking / Min",
      render: (l) => {
        const p = formatListingPrice(l);
        return p ? (
          <div>
            <div className="text-[0.55rem] text-slate-500 uppercase">{p.label}</div>
            <div className="text-sm font-extrabold text-slate-900">{p.value}</div>
          </div>
        ) : <span className="text-slate-300">—</span>;
      },
    },
    {
      label: "$ per unit",
      render: (l) => {
        const pu = pricePerUnit(l);
        return pu ? (
          <span className="font-bold text-emerald-800">{pu.value}</span>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
    },
    {
      label: "Sector",
      render: (l) => <span className="capitalize text-slate-700">{l.vertical.replace(/[-_]/g, " ")}</span>,
    },
    {
      label: "Location",
      render: (l) => (
        <span className="text-slate-700">
          {l.location_state ?? "—"}
          {l.location_city ? <span className="text-slate-500"> · {l.location_city}</span> : null}
        </span>
      ),
    },
    {
      label: "Industry / sub",
      render: (l) => (
        <span className="text-slate-700 capitalize">
          {l.industry ?? l.sub_category?.replace(/_/g, " ") ?? <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      label: "Annual revenue",
      render: (l) => l.annual_revenue_cents
        ? <span className="font-semibold text-slate-900">${(l.annual_revenue_cents / 100).toLocaleString()}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      label: "Annual profit",
      render: (l) => l.annual_profit_cents
        ? <span className="font-semibold text-slate-900">${(l.annual_profit_cents / 100).toLocaleString()}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      label: "Compliance",
      render: (l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
        const badges: React.ReactNode[] = [];
        if (l.firb_eligible) badges.push(<span key="firb" className="bg-blue-100 text-blue-700 text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded">FIRB</span>);
        if (l.siv_complying) badges.push(<span key="siv" className="bg-emerald-100 text-emerald-700 text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded">SIV</span>);
        if (wholesaleOnly) badges.push(<span key="ws" className="bg-rose-100 text-rose-700 text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded">Wholesale</span>);
        return badges.length > 0
          ? <div className="flex flex-wrap gap-1">{badges}</div>
          : <span className="text-slate-300">—</span>;
      },
    },
    {
      label: "Transparency",
      render: (l) => {
        const t = assessLotTransparency(
          l,
          buildLotProfile((l.key_metrics ?? {}) as Record<string, unknown>),
        );
        return t.level === "essential" ? (
          <span className="text-xs text-slate-500">{transparencyLevelLabel(t.level)}</span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[0.6rem] font-bold px-2 py-0.5 rounded-full">
            <Icon name="shield-check" size={9} />
            {transparencyLevelLabel(t.level)}
          </span>
        );
      },
    },
    {
      label: "Listed",
      render: (l) => (
        <span className="text-xs text-slate-500">
          {l.created_at ? new Date(l.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
  ];

  // First-class per-vertical spec rows (registry order, real formatting).
  for (const def of registryDefs) {
    rows.push({
      label: def.unit ? `${def.label} (${def.unit})` : def.label,
      render: (l) => {
        const formatted = formatMetricByDef(def, (l.key_metrics ?? {})[def.key]);
        return formatted ? (
          <span className="font-semibold text-slate-900">{formatted}</span>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
    });
  }

  // Long-tail metric rows (keys outside the registry).
  for (const k of allMetricKeys) {
    rows.push({
      label: k.replace(/_/g, " "),
      render: (l) => {
        const v = (l.key_metrics ?? {})[k as keyof typeof l.key_metrics];
        if (v == null || v === "") return <span className="text-slate-300">—</span>;
        if (typeof v === "boolean") return <span className="text-slate-700">{v ? "Yes" : "No"}</span>;
        return <span className="text-slate-700">{String(v)}</span>;
      },
    });
  }

  return (
    <div className="overflow-x-auto -mx-3 px-3 pb-32">
      <table className="min-w-full border-collapse">
        {/* ── Header row: one column per listing ────────────────── */}
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white border-b border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 align-bottom w-[140px]">
              Attribute
            </th>
            {listings.map((l) => (
              <th scope="col" key={l.slug} className="border-b border-slate-200 px-3 py-3 align-top text-left min-w-[220px]">
                <ListingHeaderCell listing={l} onRemove={() => onRemove(l.slug)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.label} className="hover:bg-slate-50/60">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 capitalize align-top w-[140px]">
                {row.label}
              </td>
              {listings.map((l) => (
                <td key={l.slug} className="px-3 py-2 text-sm align-top">
                  {row.render(l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingHeaderCell({ listing, onRemove }: { listing: InvestmentListing; onRemove: () => void }) {
  const heroImage = getListingHeroImage(
    listing.vertical,
    listing.id,
    listing.images,
    listing.sub_category ?? null,
  );
  const meta = listingKindMeta(deriveListingKind(listing));

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-slate-100">
        {heroImage && (
          <Image
            src={heroImage}
            alt={listing.title}
            fill
            sizes="220px"
            className="object-cover"
          />
        )}
        <span className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 ${meta.accent.badge} text-[0.55rem] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm`}>
          <Icon name={meta.icon} size={9} />
          {meta.label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${listing.title} from compare`}
          title="Remove from compare"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/95 hover:bg-rose-50 hover:text-rose-600 text-slate-500 inline-flex items-center justify-center shadow-sm"
        >
          <Icon name="x" size={12} />
        </button>
      </div>
      <Link href={listingUrl(listing)} className="font-bold text-sm text-slate-900 hover:text-amber-700 line-clamp-2 leading-snug">
        {listing.title}
      </Link>
    </div>
  );
}

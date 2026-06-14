/**
 * Country Mode listings preview — slim "often considered by <country>
 * investors" strip mounted ABOVE the global HomeListingsTeaser.
 *
 * Server component reading the iv_intent_country cookie. When set, fetches
 * a vertical-filtered slice of the listings feed using the country
 * config's homepageListingFilters. Below the supply threshold, returns
 * null so the global teaser carries the experience — never shows a
 * thin/fake-supply preview.
 *
 * Reads the cookie in this child only; the parent app/page.tsx stays
 * ISR-cacheable. Next.js opts this subtree into dynamic rendering when
 * cookies() is called.
 */

import Image from "next/image";
import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import {
  applySupplyThresholds,
  getHomepageFiltersForCountry,
} from "@/lib/country-mode";
import { createClient } from "@/lib/supabase/server";
import TrackedCountryLink from "./TrackedCountryLink";

interface PreviewListing {
  id: number;
  title: string;
  slug: string;
  vertical: string;
  location_display: string | null;
  price_display: string | null;
  hero_image: string | null;
}

export default async function CountryListingsPreview() {
  const code = await getIntentCountry();
  if (!code) return null;

  const filters = getHomepageFiltersForCountry(code);
  if (!filters.listings || filters.listings.verticals.length === 0) return null;

  const supabase = await createClient();
  const verticalsArr = [...filters.listings.verticals];
  const { data } = await supabase
    .from("investment_listings")
    .select("id, title, slug, vertical, location_state, location_city, price_display, images, listing_type")
    .eq("status", "active")
    .in("vertical", verticalsArr)
    .order("listing_type", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const rows: PreviewListing[] = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    vertical: r.vertical,
    location_display:
      [r.location_city, r.location_state].filter(Boolean).join(", ") || null,
    price_display: r.price_display ?? null,
    hero_image:
      Array.isArray(r.images) && r.images.length > 0 ? (r.images[0] as string) : null,
  }));

  const result = applySupplyThresholds(rows, "listings", code);
  if (result.didFallback) return null;

  const meta = intentCountryMeta(code);
  const visible = result.rows.slice(0, 4);

  return (
    <section
      aria-label={`Listings tailored for ${meta.label}`}
      data-country-strip="listings"
      className="bg-white border-y border-amber-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              <span aria-hidden className="mr-1.5">{meta.flag}</span>
              Tailored for {meta.label}
            </p>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mt-1">
              Investments often considered by investors from {meta.name}
            </h2>
          </div>
          <TrackedCountryLink
            href="/invest"
            eventName="country_listing_click"
            country={code}
            source="see_all"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            See all opportunities &rarr;
          </TrackedCountryLink>
        </div>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {visible.map((l) => (
            <li key={l.id}>
              <TrackedCountryLink
                href={`/invest/${l.vertical}/${l.slug}`}
                eventName="country_listing_click"
                country={code}
                targetId={l.id}
                source="homepage_preview"
                className="group block bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl overflow-hidden transition-colors"
              >
                {l.hero_image && (
                  <div className="relative aspect-[5/3] bg-slate-100">
                    <Image
                      src={l.hero_image}
                      alt={l.title}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {l.vertical}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 line-clamp-2 group-hover:text-amber-900">
                    {l.title}
                  </p>
                  {(l.location_display || l.price_display) && (
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {[l.price_display, l.location_display].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </TrackedCountryLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

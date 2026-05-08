/**
 * Country Mode compare preview — "platforms for <country> investors"
 * strip mounted ABOVE the global HomeCompareDeepDive.
 *
 * Server component. Filters the brokers feed by platform_type and
 * (when set) accepts_non_residents. Returns null below the platforms
 * supply threshold (3 — stricter than listings/experts because a
 * "compare" strip with fewer than 3 options has nothing to compare).
 */

import Image from "next/image";
import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import TrackedCountryLink from "./TrackedCountryLink";
import {
  applySupplyThresholds,
  getHomepageFiltersForCountry,
} from "@/lib/country-mode";
import { createClient } from "@/lib/supabase/server";
import type { PlatformType } from "@/lib/types";

interface PreviewBroker {
  id: number;
  slug: string;
  name: string;
  platform_type: PlatformType | null;
  logo_url: string | null;
  rating: number | null;
  asx_fee: string | null;
  accepts_non_residents: boolean | null;
}

export default async function CountryComparePreview() {
  const code = await getIntentCountry();
  if (!code) return null;

  const filters = getHomepageFiltersForCountry(code);
  if (!filters.platforms || filters.platforms.types.length === 0) return null;

  const supabase = await createClient();
  let query = supabase
    .from("brokers")
    .select(
      "id, slug, name, platform_type, logo_url, rating, asx_fee, accepts_non_residents",
    )
    .eq("status", "active")
    .in("platform_type", [...filters.platforms.types])
    .order("rating", { ascending: false });

  if (filters.platforms.nonResidentsOnly) {
    query = query.eq("accepts_non_residents", true);
  }

  const { data } = await query.limit(6);

  const rows: PreviewBroker[] = (data ?? []) as PreviewBroker[];

  const result = applySupplyThresholds(rows, "platforms");
  if (result.didFallback) return null;

  const meta = intentCountryMeta(code);
  const visible = result.rows.slice(0, 4);

  return (
    <section
      aria-label={`Platforms tailored for ${meta.label}`}
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
              {filters.platforms.nonResidentsOnly
                ? `Platforms that accept investors from ${meta.name}`
                : `Platforms popular with investors from ${meta.name}`}
            </h2>
          </div>
          <TrackedCountryLink
            href={
              filters.platforms.nonResidentsOnly
                ? "/compare/non-residents"
                : "/compare"
            }
            eventName="country_compare_click"
            country={code}
            source="see_all"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            Compare all &rarr;
          </TrackedCountryLink>
        </div>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {visible.map((b) => (
            <li key={b.id}>
              <TrackedCountryLink
                href={`/broker/${b.slug}`}
                eventName="country_compare_click"
                country={code}
                targetId={b.id}
                source="homepage_preview"
                className="group block bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {b.logo_url ? (
                    <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200">
                      <Image
                        src={b.logo_url}
                        alt={b.name}
                        fill
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                      {b.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-900">
                      {b.name}
                    </p>
                    {b.platform_type && (
                      <p className="text-xs text-slate-500 capitalize truncate">
                        {b.platform_type.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                  {typeof b.rating === "number" && (
                    <div className="text-xs font-semibold text-amber-700 shrink-0">
                      ★ {b.rating.toFixed(1)}
                    </div>
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

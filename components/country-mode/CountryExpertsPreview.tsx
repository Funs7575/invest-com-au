/**
 * Country Mode experts preview — "specialists for <country> investors"
 * strip mounted ABOVE the global HomeAdvisorsTeaser.
 *
 * Server component reading the iv_intent_country cookie. Filters the
 * professionals feed by `type` (the canonical advisor-type field —
 * `specialties` is jsonb and less reliable for filtering). Returns null
 * below the supply threshold so the global teaser carries the experience.
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

interface PreviewExpert {
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  location_display: string | null;
  photo_url: string | null;
}

export default async function CountryExpertsPreview() {
  const code = await getIntentCountry();
  if (!code) return null;

  const filters = getHomepageFiltersForCountry(code);
  if (!filters.experts || filters.experts.specialties.length === 0) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("professionals")
    .select(
      "slug, name, firm_name, type, location_display, photo_url, rating, review_count, verified",
    )
    .eq("status", "active")
    .eq("verified", true)
    .in("type", [...filters.experts.specialties])
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(8);

  const rows: PreviewExpert[] = (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    firm_name: r.firm_name,
    type: r.type,
    location_display: r.location_display,
    photo_url: r.photo_url,
  }));

  const result = applySupplyThresholds(rows, "experts", code);
  if (result.didFallback) return null;

  const meta = intentCountryMeta(code);
  const visible = result.rows.slice(0, 4);

  return (
    <section
      aria-label={`Experts tailored for ${meta.label}`}
      data-country-strip="experts"
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
              Specialists for investors from {meta.name}
            </h2>
          </div>
          <TrackedCountryLink
            href="/advisors"
            eventName="country_expert_click"
            country={code}
            source="see_all"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            See all experts &rarr;
          </TrackedCountryLink>
        </div>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {visible.map((e) => (
            <li key={e.slug}>
              <TrackedCountryLink
                href={`/advisor/${e.slug}`}
                eventName="country_expert_click"
                country={code}
                targetId={e.slug}
                source="homepage_preview"
                className="group block bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {e.photo_url ? (
                    <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden bg-slate-100">
                      <Image
                        src={e.photo_url}
                        alt={e.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                      {e.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-900">
                      {e.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{e.type}</p>
                    {e.firm_name && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{e.firm_name}</p>
                    )}
                  </div>
                </div>
              </TrackedCountryLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

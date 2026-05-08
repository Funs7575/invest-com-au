/**
 * Country Mode popular-starting-points strip — rendered above the
 * HomePathfinder when the user is in country mode. Each item is a
 * pre-filtered destination tailored to the country (e.g. "Brokers
 * that accept HK residents", "Get matched for HK investors").
 *
 * Reuses the country config's `defaultActions[]` directly — the same
 * source of truth that feeds the flag-button popover. No duplicate
 * config: changes to a country's headline links flow to both surfaces.
 *
 * Server component reading the iv_intent_country cookie. Renders
 * nothing when no country is set, or when the country has neither
 * homepagePopularLinks nor defaultActions defined.
 */

import Link from "next/link";
import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import { getHomepageFiltersForCountry } from "@/lib/country-mode";

export default async function CountryPopularLinks() {
  const code = await getIntentCountry();
  if (!code) return null;

  const filters = getHomepageFiltersForCountry(code);
  // Cap at 4 — keeps the strip compact and prevents config drift
  // from turning it into a wall of links.
  const links = filters.popularLinks.slice(0, 4);
  if (links.length === 0) return null;

  const meta = intentCountryMeta(code);

  return (
    <section
      aria-label={`Popular starting points for ${meta.label}`}
      className="bg-white border-y border-amber-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            <span aria-hidden className="mr-1.5">{meta.flag}</span>
            Tailored for {meta.label}
          </p>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mt-1">
            Popular starting points for investors from {meta.name}
          </h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {links.map((link) => (
            <li key={link.href + link.label}>
              <Link
                href={link.href}
                className="group flex items-start gap-3 p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl transition-colors"
              >
                <span aria-hidden className="text-base leading-tight mt-0.5">
                  {link.emoji}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-amber-900 line-clamp-1">
                    {link.label}
                  </span>
                  <span className="block text-xs text-slate-500 leading-snug line-clamp-2 mt-0.5">
                    {link.sublabel}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-slate-400 group-hover:text-amber-600 text-sm shrink-0 mt-0.5"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

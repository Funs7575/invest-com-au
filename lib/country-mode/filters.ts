/**
 * Country Mode filter resolution — given an IntentCountryCode (or null
 * for global), return the homepage filter shape the preview wrappers
 * use to query Supabase / re-rank tools.
 *
 * Returns null for any filter the country config doesn't define — the
 * convention being "null = render the global teaser, no country
 * filtering." This is the runtime expression of the "Don't fake
 * supply" rule: a half-populated config can't accidentally turn into
 * a thin country preview, because every missing field is null.
 */

import {
  getCountryConfig,
  type QuickAction,
} from "../foreign-investment-country-data";
import type { IntentCountryCode } from "../intent-context";
import type { PlatformType } from "../types";

export interface HomepageListingFiltersRuntime {
  verticals: ReadonlyArray<string>;
  firb: boolean;
}

export interface HomepageExpertFiltersRuntime {
  specialties: ReadonlyArray<string>;
  languages: ReadonlyArray<string>;
}

export interface HomepagePlatformFiltersRuntime {
  types: ReadonlyArray<PlatformType>;
  nonResidentsOnly: boolean;
}

export interface HomepageToolEntry {
  slug: string;
  label: string;
  deeplinkParams?: Record<string, string>;
}

export interface HomepageFiltersForCountry {
  /** null = render the global listings teaser, no country filtering. */
  listings: HomepageListingFiltersRuntime | null;
  /** null = render the global experts teaser, no country filtering. */
  experts: HomepageExpertFiltersRuntime | null;
  /** null = render the global compare grid, no country filtering. */
  platforms: HomepagePlatformFiltersRuntime | null;
  /** Empty array = no country-specific re-rank, render tools strip as-is. */
  tools: ReadonlyArray<HomepageToolEntry>;
  /**
   * Popular-starting-points strip content. Falls back to the country's
   * defaultActions[] (used by the flag-button popover) — the same
   * source of truth feeds both surfaces. Empty when no country, or
   * when a country has neither homepagePopularLinks nor defaultActions.
   */
  popularLinks: ReadonlyArray<QuickAction>;
}

const EMPTY_FILTERS: HomepageFiltersForCountry = {
  listings: null,
  experts: null,
  platforms: null,
  tools: [],
  popularLinks: [],
};

export function getHomepageFiltersForCountry(
  code: IntentCountryCode | null,
): HomepageFiltersForCountry {
  if (!code) return EMPTY_FILTERS;

  const config = getCountryConfig(code);
  if (!config) return EMPTY_FILTERS;

  const listings = config.homepageListingFilters
    ? {
        verticals: config.homepageListingFilters.verticals,
        firb: config.homepageListingFilters.firb ?? false,
      }
    : null;

  const experts = config.homepageExpertFilters
    ? {
        specialties: config.homepageExpertFilters.specialties,
        languages: config.homepageExpertFilters.languages ?? [],
      }
    : null;

  const platforms = config.homepagePlatformFilters
    ? {
        types: config.homepagePlatformFilters.types,
        nonResidentsOnly: config.homepagePlatformFilters.nonResidentsOnly ?? false,
      }
    : null;

  return {
    listings,
    experts,
    platforms,
    tools: config.homepageFeaturedTools ?? [],
    popularLinks: config.defaultActions ?? [],
  };
}

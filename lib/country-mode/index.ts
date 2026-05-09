/**
 * Country Mode — the layer that adapts examples, filters, and CTAs
 * around a selected/detected country without changing the global
 * navigation. See docs/architecture/country-mode.md for the contract.
 *
 * Public surface:
 * - resolveCountryFromContext — five-level priority chain (URL > cookie
 *   > GeoIP > AU/Global), returns the resolved code + which signal won
 * - getHomepageFiltersForCountry — config-to-runtime mapper for the
 *   homepage preview wrappers; returns nulls for "render global feed"
 * - applySupplyThresholds — runtime "Don't fake supply" gate; below
 *   threshold returns empty rows + didFallback so the country-specific
 *   strip hides and the global teaser below carries the experience
 * - SUPPLY_THRESHOLDS — exported constants for tests + admin tooling
 */

export {
  resolveCountryFromContext,
  type ResolvedCountry,
  type ResolvedCountrySource,
  type ResolveCountryInputs,
} from "./resolve-country";

export {
  applySupplyThresholds,
  SUPPLY_THRESHOLDS,
  PER_COUNTRY_THRESHOLDS,
  type SupplyKind,
  type SupplyResult,
} from "./supply-thresholds";

export {
  getHomepageFiltersForCountry,
  type HomepageFiltersForCountry,
  type HomepageListingFiltersRuntime,
  type HomepageExpertFiltersRuntime,
  type HomepagePlatformFiltersRuntime,
  type HomepageToolEntry,
} from "./filters";

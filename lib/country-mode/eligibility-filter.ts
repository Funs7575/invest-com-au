/**
 * Country-eligibility filter — uses the per-broker / per-advisor
 * `country_eligibility` JSONB column added in Phase 4 (PR #619 + #623)
 * to hide entities that have explicitly blocked the visitor's country
 * or whose allow-list excludes it.
 *
 * Shape (validated by CHECK constraint on brokers + professionals):
 *   {
 *     "allowed_countries": ["GB", "HK", "SG"],   -- explicit accept list
 *     "blocked_countries": ["US"],                -- explicit reject list
 *     "visa_required":     ["CN"],                -- visa/residency gated
 *     "verified_at": "2026-05-08T00:00:00Z",
 *     "notes": null
 *   }
 *
 * Decision rules ("augment, never replace" — when in doubt, show):
 *   1. No intent country → no filter, return all
 *   2. `country_eligibility` empty `{}` (default) → include (un-verified, no opinion)
 *   3. `blocked_countries` includes visitor ISO → EXCLUDE
 *   4. `allowed_countries` set AND visitor ISO not in it → EXCLUDE
 *   5. Otherwise → include
 *
 * `visa_required` is informational only — does not exclude. UI may
 * surface a "visa required" badge separately.
 *
 * Pure function — no DB / cookie access. Caller resolves the intent
 * country and passes the ISO.
 */

import { intentCountryMeta, type IntentCountryCode } from "../intent-context";

export interface CountryEligibility {
  allowed_countries?: string[];
  blocked_countries?: string[];
  visa_required?: string[];
  verified_at?: string;
  notes?: string | null;
}

export interface EntityWithEligibility {
  country_eligibility?: CountryEligibility | Record<string, unknown> | null;
}

/**
 * Returns true when the entity is eligible for a visitor with the
 * given intent country. See decision rules in the file header.
 */
export function isEligibleForCountry(
  entity: EntityWithEligibility,
  intentCountry: IntentCountryCode | null,
): boolean {
  if (!intentCountry) return true;

  const elig = entity.country_eligibility as CountryEligibility | null | undefined;
  if (!elig || typeof elig !== "object") return true;

  const meta = intentCountryMeta(intentCountry);
  const visitorIso = meta.iso.toUpperCase();

  const blocked = Array.isArray(elig.blocked_countries) ? elig.blocked_countries : null;
  if (blocked && blocked.map((c) => c.toUpperCase()).includes(visitorIso)) {
    return false;
  }

  const allowed = Array.isArray(elig.allowed_countries) ? elig.allowed_countries : null;
  if (allowed && allowed.length > 0 && !allowed.map((c) => c.toUpperCase()).includes(visitorIso)) {
    return false;
  }

  return true;
}

/**
 * Filter an array of entities by country eligibility. Convenience
 * wrapper over isEligibleForCountry — preserves array order.
 */
export function filterByCountryEligibility<T extends EntityWithEligibility>(
  entities: ReadonlyArray<T>,
  intentCountry: IntentCountryCode | null,
): T[] {
  if (!intentCountry) return [...entities];
  return entities.filter((e) => isEligibleForCountry(e, intentCountry));
}

/**
 * Returns true when visa is required for the entity for the given
 * country. UI uses this to surface a "visa required" badge.
 */
export function requiresVisaForCountry(
  entity: EntityWithEligibility,
  intentCountry: IntentCountryCode | null,
): boolean {
  if (!intentCountry) return false;
  const elig = entity.country_eligibility as CountryEligibility | null | undefined;
  if (!elig || typeof elig !== "object") return false;
  const visa = Array.isArray(elig.visa_required) ? elig.visa_required : null;
  if (!visa) return false;
  const meta = intentCountryMeta(intentCountry);
  return visa.map((c) => c.toUpperCase()).includes(meta.iso.toUpperCase());
}

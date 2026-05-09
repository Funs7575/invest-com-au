/**
 * EligibilityBadge — visible signal that a broker / advisor / fund accepts
 * (or doesn't) the current visitor's country.
 *
 * PR queue #12. Compounds with PR #683 (which silently filters incompatible
 * brokers from /best/[slug]) by making the country-mode work *visible* to
 * users on every card surface. Without this, a HK visitor sees fewer
 * brokers but doesn't know why.
 *
 * Renders one of:
 *   🟢 "Accepts {Country} clients"  — entity in allowed_countries OR
 *                                      no opinion + visitor has intent
 *   🟡 "Visa required for {Country}" — entity in visa_required
 *   🔴 "Not available in {Country}"  — entity in blocked_countries
 *                                      (usually filtered out, but on
 *                                      browse-all surfaces shown grayed)
 *   (null)                            — no intent country, or entity has
 *                                       no eligibility metadata at all
 *
 * Pure client component — no DB / cookie access. Caller resolves the
 * intent country (server-side via getIntentCountry, or client via
 * useIntentCountry) and passes it down.
 */

import {
  isEligibleForCountry,
  requiresVisaForCountry,
  type EntityWithEligibility,
} from "@/lib/country-mode/eligibility-filter";
import { intentCountryMeta, type IntentCountryCode } from "@/lib/intent-context";

interface Props {
  entity: EntityWithEligibility;
  intentCountry: IntentCountryCode | null;
  /** When true: show the badge even for "default eligible / no opinion" — useful on directory pages where users want explicit confirmation. */
  showWhenSilent?: boolean;
  /** When true: render in compact pill style (smaller, less padding). */
  compact?: boolean;
}

export default function EligibilityBadge({
  entity,
  intentCountry,
  showWhenSilent = false,
  compact = false,
}: Props) {
  if (!intentCountry) return null;

  const meta = intentCountryMeta(intentCountry);
  const country = meta.label.replace(/ investors$/, "").trim() || meta.name;

  const elig = entity.country_eligibility as
    | { allowed_countries?: string[]; blocked_countries?: string[]; visa_required?: string[] }
    | null
    | undefined;

  // Determine state in priority order: blocked > visa > allowed > silent
  const visitorIso = meta.iso.toUpperCase();
  const blocked = Array.isArray(elig?.blocked_countries)
    ? elig.blocked_countries.map((c) => c.toUpperCase())
    : [];
  const allowed = Array.isArray(elig?.allowed_countries)
    ? elig.allowed_countries.map((c) => c.toUpperCase())
    : [];
  const visa = Array.isArray(elig?.visa_required)
    ? elig.visa_required.map((c) => c.toUpperCase())
    : [];

  const isBlocked = blocked.includes(visitorIso);
  const requiresVisa = !isBlocked && visa.includes(visitorIso);
  const isExplicitlyAllowed = !isBlocked && !requiresVisa && allowed.includes(visitorIso);
  const isEligible = isEligibleForCountry(entity, intentCountry);

  // Don't render anything when:
  //   - visitor IS eligible
  //   - AND no explicit allow / visa-required signal
  //   - AND showWhenSilent=false
  if (!isBlocked && !requiresVisa && !isExplicitlyAllowed && !showWhenSilent) {
    return null;
  }

  // Style classes per state
  const baseClasses = compact
    ? "inline-flex items-center gap-1 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full border"
    : "inline-flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-full border";

  if (isBlocked) {
    return (
      <span
        className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}
        title={`This option is not available in ${country}.`}
        data-testid="eligibility-badge-blocked"
      >
        <span aria-hidden>{meta.flag}</span>
        Not available in {country}
      </span>
    );
  }

  if (requiresVisa) {
    return (
      <span
        className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}
        title={`Available in ${country} with visa or residency documentation.`}
        data-testid="eligibility-badge-visa"
      >
        <span aria-hidden>{meta.flag}</span>
        Visa required for {country}
      </span>
    );
  }

  if (isExplicitlyAllowed) {
    return (
      <span
        className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
        title={`This option accepts ${country} clients.`}
        data-testid="eligibility-badge-allowed"
      >
        <span aria-hidden>{meta.flag}</span>
        Accepts {country} clients
      </span>
    );
  }

  // showWhenSilent + eligible-by-default → render a soft "available globally" pill
  if (showWhenSilent && isEligible) {
    return (
      <span
        className={`${baseClasses} bg-slate-50 text-slate-600 border-slate-200`}
        title={`No country restrictions on file — available globally.`}
        data-testid="eligibility-badge-silent"
      >
        <span aria-hidden>🌏</span>
        Available globally
      </span>
    );
  }

  return null;
}

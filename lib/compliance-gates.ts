/**
 * Default-OFF gates for flows that need regulatory authorisation BEYOND the
 * planned general-advice AFSL (see docs/strategy/REGULATORY-AVOID-LIST.md).
 *
 * These are intentionally env-var driven, NOT admin-toggleable feature flags
 * (`lib/feature-flags.ts`): flipping one of these on is a deliberate
 * infrastructure change that must follow founder + legal sign-off, and must
 * not be reachable from an admin toggle UI. Unset (the default) means OFF.
 */

/**
 * Startup capital-raising — opening rounds, sharing data-room materials,
 * matching investors to offers — is crowd-sourced-funding (CSF) intermediary
 * territory (RG 261/262). It requires a CSF intermediary authorisation the
 * entity does not hold. OFF until that authorisation is granted.
 *
 * Set `STARTUP_RAISES_ENABLED=true` to re-enable (founder + legal sign-off
 * required).
 */
export function startupRaisesEnabled(): boolean {
  return process.env.STARTUP_RAISES_ENABLED === "true";
}

export const STARTUP_RAISES_DISABLED_MESSAGE =
  "Capital-raising features are temporarily unavailable pending regulatory authorisation.";

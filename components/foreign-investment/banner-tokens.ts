/**
 * Shared visual tokens for the country-aware banner stack
 * (IntentCountryBadge + CountryRuleAlerts + IntentCountryRecommendation).
 *
 * Centralising the colour, border, radius and spacing values keeps the
 * three components visually coherent — they sit one above the other on
 * /invest, /advisors and /compare so even a one-pixel divergence reads
 * as a bug. Update tokens here; never inline bg-amber-50 across the
 * three components.
 */

export const BANNER_RADIUS = "rounded-2xl";
export const BANNER_PADDING = "p-4 md:p-5";

// Pill — the small "Browsing as X investors" chip above the cards.
export const BADGE_BG = "bg-amber-50";
export const BADGE_BORDER = "border-amber-200";
export const BADGE_TEXT = "text-amber-900";
export const BADGE_DIVIDER = "text-amber-300";
export const BADGE_LINK_HOVER = "hover:text-amber-700";

// Recommendation card — the advisory CTA card (amber tone, advisory copy).
export const RECOMMENDATION_BG = "bg-amber-50";
export const RECOMMENDATION_BORDER = "border-amber-200";
export const RECOMMENDATION_TITLE_TEXT = "text-amber-900";
export const RECOMMENDATION_BODY_TEXT = "text-amber-800";
export const RECOMMENDATION_CTA_BG = "bg-amber-500";
export const RECOMMENDATION_CTA_TEXT = "text-white";
export const RECOMMENDATION_CTA_HOVER = "hover:bg-amber-400";
export const RECOMMENDATION_APPLIED_BG = "bg-emerald-500";

// Rule-alert severity palette. Used by CountryRuleAlerts.
// Info = informational, Warning = action recommended, Urgent = compliance risk.
export const ALERT_INFO = "border-blue-200 bg-blue-50 text-blue-900";
export const ALERT_WARNING = "border-amber-200 bg-amber-50 text-amber-900";
export const ALERT_URGENT = "border-red-200 bg-red-50 text-red-900";

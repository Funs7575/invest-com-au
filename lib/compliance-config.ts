/**
 * Compliance Configuration — Feature Flag System
 *
 * This file controls which features are enabled based on the site's
 * licensing status. When operating without an AFSL, certain features
 * that constitute "general advice" under s766B of the Corporations Act
 * must be disabled.
 *
 * TO RE-ENABLE FEATURES AFTER OBTAINING AN AFSL:
 * 1. Change LICENCE_MODE to "general_advice"
 * 2. Redeploy — all features will automatically re-enable
 *
 * Modes:
 * - "factual_only"   → No AFSL. Factual comparisons, directories, calculators only.
 *                       No ratings, rankings, "best" labels, quiz matching, or
 *                       personalised recommendations.
 * - "general_advice"  → AFSL obtained for general advice. Enables star ratings,
 *                       editorial picks, quiz matching, "best" labels, and
 *                       general advice warnings.
 * - "personal_advice" → Full personal advice AFSL. Enables personalised
 *                       recommendations, suitability assessments, SOAs.
 *                       (Not currently implemented.)
 */

export type LicenceMode = "factual_only" | "general_advice" | "personal_advice";

export const LICENCE_MODE: LicenceMode =
  (process.env.NEXT_PUBLIC_LICENCE_MODE as LicenceMode) || "factual_only";

// ─── Feature Flags ───────────────────────────────────────────────────────────

/** Show star ratings (★ 4.7) on broker/platform cards and tables */
export const SHOW_RATINGS = LICENCE_MODE !== "factual_only";

/** Show "Editor's Choice", "Top Rated", "Lowest Fees" badges */
export const SHOW_EDITORIAL_BADGES = LICENCE_MODE !== "factual_only";

/** Show "Best Platforms 2026" style pages and navigation links */
export const SHOW_BEST_PICKS = LICENCE_MODE !== "factual_only";

/** Enable the quiz/matching engine (personalised platform/advisor matching) */
export const SHOW_QUIZ_MATCH = LICENCE_MODE !== "factual_only";

/** Show the quiz as a self-service filter tool (always available) */
export const SHOW_FILTER_TOOL = true;

/** Show "Start Free Match" / "match you with" style CTAs */
export const SHOW_MATCH_LANGUAGE = LICENCE_MODE !== "factual_only";

/** Show "ASIC-Verified Professionals" as a generic marketing claim */
export const SHOW_GENERIC_VERIFIED = LICENCE_MODE !== "factual_only";

/** Show weighted/algorithmic scoring that implies recommendation */
export const SHOW_WEIGHTED_SCORES = LICENCE_MODE !== "factual_only";

/** Enable internal lead routing (auto-selecting which advisor receives a lead) */
export const ENABLE_AUTO_LEAD_ROUTING = LICENCE_MODE !== "factual_only";

/** Show "Verified" badge on advisor profiles */
export const SHOW_ADVISOR_VERIFIED_BADGE = LICENCE_MODE !== "factual_only";

/** Show advisor star ratings and review counts */
export const SHOW_ADVISOR_RATINGS = LICENCE_MODE !== "factual_only";

// ─── Safe Features (always enabled regardless of licence mode) ──────────────

/** Factual fee comparison tables with user-controlled sorting */
export const SHOW_FEE_TABLES = true;

/** Broker/advisor directory listings */
export const SHOW_DIRECTORIES = true;

/** Educational content, guides, glossary, articles */
export const SHOW_EDUCATIONAL_CONTENT = true;

/** Calculators (brokerage, mortgage, retirement, etc.) */
export const SHOW_CALCULATORS = true;

/** Clearly labelled "Promoted" / "Advertisement" placements */
export const SHOW_PROMOTED_PLACEMENTS = true;

/** Email capture for educational content (PDFs, guides) */
export const SHOW_LEAD_MAGNETS = true;

/** User-initiated contact forms (user chooses who to contact) */
export const SHOW_CONTACT_FORMS = true;

/** Investment marketplace listings with user-initiated enquiries */
export const SHOW_MARKETPLACE = true;

/** Affiliate links (these are advertising, not advice) */
export const SHOW_AFFILIATE_LINKS = true;

// ─── CTA Text Helpers ────────────────────────────────────────────────────────

/** Primary CTA text for the main funnel */
export const PRIMARY_CTA_TEXT = SHOW_MATCH_LANGUAGE
  ? "Start My Free Match"
  : "Compare Platforms";

/** Primary CTA href */
export const PRIMARY_CTA_HREF = SHOW_QUIZ_MATCH ? "/quiz" : "/compare";

/** Secondary CTA text */
export const SECONDARY_CTA_TEXT = SHOW_MATCH_LANGUAGE
  ? "Find the Right Advisor"
  : "Browse Directories";

/** Secondary CTA href */
export const SECONDARY_CTA_HREF = SHOW_MATCH_LANGUAGE
  ? "/find-advisor"
  : "/advisors";

/** Advisor directory heading */
export const ADVISOR_DIRECTORY_HEADING = SHOW_GENERIC_VERIFIED
  ? "Find a Verified Professional"
  : "Browse Registered Professionals";

/** Advisor directory subtext */
export const ADVISOR_DIRECTORY_SUBTEXT = SHOW_GENERIC_VERIFIED
  ? "ASIC-verified professionals matched to your needs."
  : "Directory of licensed professionals. Public register details shown where applicable.";

/** Platform comparison heading */
export const PLATFORM_COMPARE_HEADING = SHOW_EDITORIAL_BADGES
  ? "Top Rated Platforms"
  : "Platform Comparison Table";

/** Platform comparison subtext */
export const PLATFORM_COMPARE_SUBTEXT = SHOW_EDITORIAL_BADGES
  ? "Ranked by fees, features & user experience."
  : "Factual comparison data from public sources. Sort and filter based on your own priorities.";

// ─── Register-Specific Wording (used when SHOW_GENERIC_VERIFIED is false) ───

export const REGISTER_WORDING: Record<string, string> = {
  financial_planner:
    "Financial adviser details checked against the Financial Advisers Register on Moneysmart",
  smsf_accountant:
    "Registered tax agent details checked against the Tax Practitioners Board public register",
  tax_agent:
    "Registered tax agent details checked against the Tax Practitioners Board public register",
  mortgage_broker:
    "Australian Credit Licence / credit representative details checked against ASIC credit register",
  buyers_agent:
    "Licensed real estate agent details checked against state/territory fair trading register",
  real_estate_agent:
    "Licensed real estate agent details checked against state/territory fair trading register",
  insurance_broker:
    "AFS licence details checked against ASIC professional registers",
  estate_planner:
    "Legal practitioner details checked against relevant state/territory law society register",
  wealth_manager:
    "AFS licence / authorised representative details checked against ASIC professional registers",
  crypto_advisor:
    "AFS licence details checked against ASIC professional registers where applicable",
  aged_care_advisor:
    "Professional registration details checked where applicable",
  debt_counsellor:
    "Professional registration details checked where applicable",
  property_advisor:
    "Licensed real estate agent details checked against state/territory fair trading register",
};

/** Get register-specific wording for an advisor type */
export function getRegisterWording(type: string): string {
  return REGISTER_WORDING[type] || "Professional registration details checked where applicable";
}

// ─── Factual Disclaimer Text ────────────────────────────────────────────────

export const FACTUAL_COMPARISON_DISCLAIMER =
  "This table presents factual comparison information collected from public sources and provider materials. Users can sort and filter based on their own priorities. No platform is recommended as suitable for any individual.";

export const FACTUAL_DIRECTORY_DISCLAIMER =
  "This is a directory of licensed professionals. Listings are not recommendations. Users should verify licence details independently and seek advice appropriate to their circumstances.";

export const FACTUAL_CALCULATOR_DISCLAIMER =
  "This calculator provides illustrative estimates only based on the assumptions shown. Results are not financial advice. Actual outcomes may differ. Consult a licensed professional for advice specific to your situation.";

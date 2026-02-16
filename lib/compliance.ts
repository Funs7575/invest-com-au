/**
 * Single source of truth for all disclosure, disclaimer, and warning text.
 * Every component that displays compliance text MUST import from here.
 * Do NOT hardcode disclosure wording anywhere else in the codebase.
 */

/** Full advertiser disclosure — used in footer, dedicated disclosure sections */
export const ADVERTISER_DISCLOSURE =
  "Invest.com.au may receive compensation from partners featured on this site. " +
  "This compensation may influence which products we write about and their placement, " +
  'including whether they appear as "Promoted." However, our editorial ratings and reviews ' +
  "are determined independently through our research methodology and are never influenced " +
  "by commercial relationships. Our site does not include all available offers.";

/** Short advertiser disclosure — used in header bar, inline near CTAs */
export const ADVERTISER_DISCLOSURE_SHORT =
  "We may be paid by partners on this site. This can influence placement but not our independent editorial ratings.";

/** Full general advice warning — used on every page with financial content */
export const GENERAL_ADVICE_WARNING =
  "The information on Invest.com.au is general in nature and does not take into account " +
  "your personal financial situation. It is not financial advice. Consider whether the " +
  "information is appropriate to your needs, and where appropriate, seek professional " +
  "advice from a financial adviser. Past performance is not a reliable indicator of " +
  "future performance.";

/** Short risk warning — placed near every outbound CTA button */
export const RISK_WARNING_CTA =
  "General advice only \u2014 not a personal recommendation.";

/** Crypto-specific risk warning */
export const CRYPTO_WARNING =
  "Cryptocurrency is highly speculative and not legal tender. You could lose all of " +
  "your investment. Only invest what you can afford to lose.";

/** Regulatory note */
export const REGULATORY_NOTE =
  "Invest.com.au is not a financial product issuer, credit provider, or financial adviser. " +
  "We are an information service. Always verify information with the product issuer before " +
  "making a decision.";

/**
 * "Why we matched you" reason builder for the DIY-platform results.
 *
 * Extracted from the inline `getMatchReasons` in app/quiz/page.tsx so the
 * logic is unit-testable and reusable. Every bullet is driven by real broker
 * attributes (asx_fee, chess_sponsored, rating, smsf_support, min_deposit …)
 * mapped against the user's answer signals — never generic platform-type copy.
 *
 * For the advisor-side counterpart see lib/quiz-advisor-match-reasons.ts.
 */

export interface PlatformBrokerAttrs {
  platform_type: string;
  is_crypto?: boolean;
  chess_sponsored?: boolean;
  smsf_support?: boolean;
  asx_fee?: string;
  asx_fee_value?: number;
  us_fee?: string;
  us_fee_value?: number;
  fx_rate?: number;
  rating?: number;
  min_deposit?: string;
  inactivity_fee?: string;
  fee_audit?: Record<string, string | number | null> | null;
  markets?: string[];
  regulated_by?: string;
}

/**
 * Returns up to `max` (default 4) specific, attribute-driven bullets explaining
 * why this platform matched the user's quiz answers.
 *
 * @param scoringAnswers - Array of quiz answer keys (goal, experience, amount,
 *   priority, property_sub — from `toScoringAnswers()`).
 * @param broker - Platform's attributes from the DB / API response.
 * @param max - Max bullets to return (default 4, runners-up show 2).
 */
export function getMatchReasons(
  scoringAnswers: string[],
  broker: PlatformBrokerAttrs,
  max = 4,
): string[] {
  const reasons: string[] = [];
  const add = (r: string) => {
    if (r && reasons.length < max && !reasons.includes(r)) reasons.push(r);
  };

  const pt = broker.platform_type;

  // ── Answer signals ────────────────────────────────────────────────────────
  const wantsFees    = scoringAnswers.includes("fees") || scoringAnswers.includes("income");
  const wantsSafety  = scoringAnswers.includes("safety");
  const wantsTools   = scoringAnswers.includes("tools") || scoringAnswers.includes("pro");
  const wantsSimple  = scoringAnswers.includes("simple") || scoringAnswers.includes("beginner") || scoringAnswers.includes("automate");
  const hasCrypto    = scoringAnswers.includes("crypto");
  const hasSmsf      = scoringAnswers.includes("super") || scoringAnswers.includes("property-super");
  const isLarge      = scoringAnswers.includes("large") || scoringAnswers.includes("whale") || scoringAnswers.includes("xlarge");
  const isSmall      = scoringAnswers.includes("small");
  const hasUsShares  = scoringAnswers.includes("us_shares");

  // ── Platform-type–specific reasons ───────────────────────────────────────

  if (pt === "robo_advisor") {
    add("Automated — set your risk profile once and the platform invests for you");
    if (broker.min_deposit) add(`Start from just ${broker.min_deposit} — no manual stock-picking needed`);
    if (broker.rating != null && broker.rating >= 4.0)
      add(`Rated ${broker.rating}/5 — one of Australia's top robo-advisors`);
    if (wantsSimple) add("Diversified portfolio built and rebalanced automatically");
    const mgmt = broker.fee_audit?.["management_fee"];
    if (mgmt != null && mgmt !== "") add(`${mgmt} annual management fee — simple, transparent pricing`);

  } else if (pt === "super_fund") {
    if (broker.rating != null && broker.rating >= 4.0)
      add(`Rated ${broker.rating}/5 for long-term performance and low fees`);
    else
      add("Strong long-term investment returns with low ongoing fees");
    if (hasSmsf) add("Built for SMSF members — streamlined compliance and reporting tools");
    if (wantsSimple) add("Simple online management — most fund transfers complete within 10 minutes");
    add("Linked to MyGov — view your balance and contributions in real time");

  } else if (pt === "crypto_exchange" || broker.is_crypto) {
    add("AUSTRAC-registered Australian crypto exchange");
    if (hasCrypto) add("Wide range of cryptocurrencies with direct AUD pairs");
    if (broker.rating != null && broker.rating >= 4.0)
      add(`Rated ${broker.rating}/5 by our editorial team`);
    if (isLarge)
      add("Competitive fee tiers for higher-volume trading");
    else
      add("Easy to buy, sell, and track your crypto portfolio in one place");

  } else if (pt === "cfd_forex") {
    add("Access to CFDs, forex, and global indices with leverage");
    if (wantsTools)
      add("Advanced charting, risk-management tools, and direct market access");
    if (broker.rating != null && broker.rating >= 4.0)
      add(`Rated ${broker.rating}/5 — used by active Australian traders`);
    if (isLarge) add("Tight spreads and competitive commissions for high-volume traders");

  } else if (pt === "property_platform") {
    add("Invest in property from as little as $100 — no stamp duty, no agency fees");
    add("Monthly rental income distributions paid directly to your account");
    if (broker.rating != null && broker.rating >= 4.0)
      add(`Rated ${broker.rating}/5 by our editorial team`);
    add("Fully managed — tenants, maintenance, and compliance handled for you");

  } else if (pt === "savings_account" || pt === "term_deposit") {
    add("Australian government deposit guarantee up to $250,000");
    if (broker.min_deposit) add(`Start from ${broker.min_deposit} — no lock-up period required`);
    if (broker.rating != null && broker.rating >= 4.0)
      add(`Rated ${broker.rating}/5 by our editorial team`);
    add("Earn competitive interest while keeping your funds accessible");

  } else {
    // ── Share broker — fully attribute-driven ──────────────────────────────

    // 1. Brokerage fee
    if (broker.asx_fee_value === 0) {
      add("Zero brokerage on ASX trades");
    } else if (wantsFees && broker.asx_fee) {
      add(`ASX brokerage from ${broker.asx_fee} — matches your low-fee priority`);
    } else if (broker.asx_fee) {
      add(`ASX brokerage from ${broker.asx_fee}`);
    }

    // 2. CHESS sponsorship
    if (wantsSafety && broker.chess_sponsored) {
      add("CHESS sponsored — your shares held directly in your name (maximum protection)");
    } else if (broker.chess_sponsored) {
      add("CHESS sponsored — highest ownership protection available in Australia");
    }

    // 3. Tools / research
    if (wantsTools) {
      add("Advanced charting, stock screeners, and analyst research tools");
    }

    // 4. SMSF
    if (broker.smsf_support && (hasSmsf || isLarge)) {
      add("SMSF account support — invest your super directly through this platform");
    }

    // 5. International / US shares at larger amounts
    if (hasUsShares || isLarge) {
      if (broker.us_fee) {
        add(`International shares from ${broker.us_fee} — competitive for your portfolio size`);
      } else if (broker.fx_rate != null && broker.fx_rate <= 0.6) {
        add(`Low FX conversion (${broker.fx_rate}%) — saves significantly on international trades`);
      }
    }

    // 6. Beginner friendliness
    if (wantsSimple && !reasons.some(r => r.includes("beginner") || r.includes("simple") || r.includes("interface"))) {
      add("Clean, intuitive interface — easy to get started without a finance background");
    }

    // 7. No inactivity fee (relevant for small/beginner accounts)
    if ((isSmall || wantsSimple) && broker.inactivity_fee) {
      const fee = broker.inactivity_fee.toLowerCase();
      if (fee === "$0" || fee.includes("none") || fee.includes("nil") || fee.includes("no ")) {
        if (reasons.length < max - 1) add("No inactivity fee — ideal when building slowly");
      }
    }

    // 8. Rating (late-stage addition so specifics come first)
    if (broker.rating != null) {
      if (broker.rating >= 4.5) add(`Rated ${broker.rating}/5 by our editorial team — consistently top-ranked`);
      else if (broker.rating >= 4.0) add(`Rated ${broker.rating}/5 by our editorial team`);
    }
  }

  // ── Universal fallback (should rarely fire with the above logic) ──────────
  if (reasons.length === 0) {
    if (broker.rating != null && broker.rating >= 4.0) {
      add(`Rated ${broker.rating}/5 — strong match for your selected criteria`);
    } else {
      add("Matched to your investment goals and preferences");
    }
  }

  return reasons.slice(0, max);
}

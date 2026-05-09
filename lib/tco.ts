/**
 * True-cost / total-cost-of-ownership math for broker comparison.
 *
 * The `headline` figure is what brokers advertise (e.g. "$0 brokerage").
 * The `effective` figure is what the user will actually pay over a year,
 * once FX spread, inactivity fees, and (optionally) transfer-out fees
 * are factored in. Surface both — the gap is the value prop of this site.
 *
 * Coverage:
 *   `coverageScore` is 0..1 expressing how many components had data.
 *   When < 1, render a "data incomplete" pip rather than letting an
 *   under-reported broker win on absolute number. (See plan W1-D risk.)
 *
 * AFSL: arithmetic over disclosed fees only — not advice. Each component
 *   carries a `sourceField` for the caller to render via <DatedStatBadge>.
 */

/** Subset of broker fields we need for the calc. Intentionally narrow. */
export interface BrokerFeeProfile {
  slug: string;
  /** ASX trade brokerage in AUD per trade. Headline number for ASX. */
  asx_fee_value: number | null;
  /** US trade brokerage in AUD per trade. Headline for US. */
  us_fee_value: number | null;
  /** FX spread as a decimal (0.006 = 0.6%). Applied to USD * trade size. */
  fx_rate: number | null;
  /** Annual inactivity fee in AUD. Null = no inactivity fee or unknown. */
  inactivity_fee_value: number | null;
  /** One-off transfer-out fee in AUD (CHESS holding move). Optional column. */
  account_transfer_out_fee?: number | null;
  /**
   * Threshold in AUD below which inactivity fee triggers. Null/undefined =
   * conservatively assume the user IS active enough to dodge it (don't
   * penalize broker that simply doesn't disclose the trigger).
   */
  inactivity_threshold_balance?: number | null;
}

/** What the user is doing on the platform. All optional with safe defaults. */
export interface TradingProfile {
  /** ASX trades per month. Default 0. */
  asx_trades_per_month?: number;
  /** US trades per month. Default 0. */
  us_trades_per_month?: number;
  /** Avg USD value per US trade (used for FX-spread cost). Default 0. */
  avg_us_trade_amount_usd?: number;
  /** Holding balance in AUD (used to check inactivity threshold). Default 50_000. */
  avg_holding_balance_aud?: number;
  /** Whether to amortise transfer-out fee. Default false. */
  include_transfer_out?: boolean;
  /** Horizon over which to amortise one-off fees. Default 1. */
  horizon_years?: number;
}

export interface TrueCostComponent {
  label: string;
  amount: number;
  sourceField: keyof BrokerFeeProfile;
  /** When null = field was missing on the broker (subtracts from coverageScore). */
  fromKnownData: boolean;
}

export interface TrueCostBreakdown {
  /** What the broker advertises as the per-trade fee for the user's primary venue. */
  headline: number | null;
  /** Year-1 effective cost in AUD with all components folded in. */
  effective: number;
  components: TrueCostComponent[];
  /** Fraction (0..1) of the *applicable* fee components for which the broker has data. */
  coverageScore: number;
}

const DEFAULTS = {
  asx_trades_per_month: 0,
  us_trades_per_month: 0,
  avg_us_trade_amount_usd: 0,
  avg_holding_balance_aud: 50_000,
  include_transfer_out: false,
  horizon_years: 1,
} as const;

/** Pick the headline figure based on what the user actually does. */
function pickHeadline(broker: BrokerFeeProfile, profile: TradingProfile): number | null {
  const asx = profile.asx_trades_per_month ?? 0;
  const us = profile.us_trades_per_month ?? 0;
  if (asx === 0 && us === 0) {
    return broker.asx_fee_value ?? broker.us_fee_value;
  }
  return us > asx ? broker.us_fee_value : broker.asx_fee_value;
}

export function computeTrueCost(
  broker: BrokerFeeProfile,
  profile: TradingProfile = {},
): TrueCostBreakdown {
  const p = { ...DEFAULTS, ...profile };

  const components: TrueCostComponent[] = [];
  let knownApplicable = 0;
  let totalApplicable = 0;

  // --- ASX brokerage ---
  if (p.asx_trades_per_month > 0) {
    totalApplicable += 1;
    if (broker.asx_fee_value !== null && broker.asx_fee_value !== undefined) {
      knownApplicable += 1;
      const yearly = broker.asx_fee_value * p.asx_trades_per_month * 12;
      components.push({
        label: `ASX brokerage (${p.asx_trades_per_month}/mo × $${broker.asx_fee_value})`,
        amount: yearly,
        sourceField: "asx_fee_value",
        fromKnownData: true,
      });
    } else {
      components.push({
        label: "ASX brokerage (data unavailable)",
        amount: 0,
        sourceField: "asx_fee_value",
        fromKnownData: false,
      });
    }
  }

  // --- US brokerage ---
  if (p.us_trades_per_month > 0) {
    totalApplicable += 1;
    if (broker.us_fee_value !== null && broker.us_fee_value !== undefined) {
      knownApplicable += 1;
      const yearly = broker.us_fee_value * p.us_trades_per_month * 12;
      components.push({
        label: `US brokerage (${p.us_trades_per_month}/mo × $${broker.us_fee_value})`,
        amount: yearly,
        sourceField: "us_fee_value",
        fromKnownData: true,
      });
    } else {
      components.push({
        label: "US brokerage (data unavailable)",
        amount: 0,
        sourceField: "us_fee_value",
        fromKnownData: false,
      });
    }
  }

  // --- FX spread on USD volume ---
  // Only relevant when there's USD volume. fx_rate is a decimal (0.006 = 0.6%).
  const usdVolumeYr =
    (p.us_trades_per_month ?? 0) * 12 * (p.avg_us_trade_amount_usd ?? 0);
  if (usdVolumeYr > 0) {
    totalApplicable += 1;
    if (broker.fx_rate !== null && broker.fx_rate !== undefined) {
      knownApplicable += 1;
      const fxCostUsd = usdVolumeYr * broker.fx_rate;
      // Keep the math intuitive — caller can convert USD→AUD with their own
      // rate; for the headline figure we treat 1 USD ≈ 1 AUD so the "FX cost"
      // line stays in AUD-equivalents. (Spread itself is the dominant variable.)
      components.push({
        label: `FX spread (${(broker.fx_rate * 100).toFixed(2)}% on ~$${Math.round(usdVolumeYr).toLocaleString()} USD)`,
        amount: fxCostUsd,
        sourceField: "fx_rate",
        fromKnownData: true,
      });
    } else {
      components.push({
        label: "FX spread (data unavailable)",
        amount: 0,
        sourceField: "fx_rate",
        fromKnownData: false,
      });
    }
  }

  // --- Inactivity fee ---
  // Always considered applicable (every account either pays it or doesn't).
  totalApplicable += 1;
  if (broker.inactivity_fee_value !== null && broker.inactivity_fee_value !== undefined) {
    knownApplicable += 1;
    // If the broker disclosed a threshold and the user's balance clears it,
    // don't add the fee. Otherwise assume the fee applies.
    const threshold = broker.inactivity_threshold_balance ?? null;
    const balance = p.avg_holding_balance_aud ?? 0;
    const triggers = threshold === null || balance < threshold;
    if (triggers && broker.inactivity_fee_value > 0) {
      components.push({
        label: `Inactivity fee ($${broker.inactivity_fee_value}/yr)`,
        amount: broker.inactivity_fee_value,
        sourceField: "inactivity_fee_value",
        fromKnownData: true,
      });
    } else {
      components.push({
        label: "Inactivity fee (does not apply at your balance)",
        amount: 0,
        sourceField: "inactivity_fee_value",
        fromKnownData: true,
      });
    }
  } else {
    components.push({
      label: "Inactivity fee (data unavailable)",
      amount: 0,
      sourceField: "inactivity_fee_value",
      fromKnownData: false,
    });
  }

  // --- Transfer-out fee (one-off, amortised over horizon) ---
  if (p.include_transfer_out) {
    totalApplicable += 1;
    if (
      broker.account_transfer_out_fee !== null &&
      broker.account_transfer_out_fee !== undefined
    ) {
      knownApplicable += 1;
      const amortised =
        broker.account_transfer_out_fee / Math.max(1, p.horizon_years);
      if (amortised > 0) {
        components.push({
          label: `Transfer-out (amortised over ${p.horizon_years}yr)`,
          amount: amortised,
          sourceField: "account_transfer_out_fee",
          fromKnownData: true,
        });
      } else {
        components.push({
          label: "Transfer-out (free)",
          amount: 0,
          sourceField: "account_transfer_out_fee",
          fromKnownData: true,
        });
      }
    } else {
      components.push({
        label: "Transfer-out (data unavailable)",
        amount: 0,
        sourceField: "account_transfer_out_fee",
        fromKnownData: false,
      });
    }
  }

  const effective = components.reduce((sum, c) => sum + c.amount, 0);
  const headline = pickHeadline(broker, profile);
  const coverageScore = totalApplicable === 0 ? 1 : knownApplicable / totalApplicable;

  return { headline, effective, components, coverageScore };
}

/**
 * Format an effective-cost value for display in tables. Cents are dropped
 * for headline numbers but preserved when amount < $10 so a $3 broker doesn't
 * collapse to "$3" alongside a $0 broker.
 */
export function formatTcoAmount(amount: number): string {
  if (amount === 0) return "$0";
  if (amount < 10) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount).toLocaleString()}`;
}

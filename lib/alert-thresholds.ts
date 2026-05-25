/**
 * Alert threshold evaluation — pure, side-effect-free, fully tested.
 *
 * Given a subscription and a current metric value, decide whether an
 * alert should fire. Hysteresis prevents re-fire spam when the metric
 * hovers around the threshold.
 *
 * Supported metric kinds (mirrors rate_alert_subscriptions.metric_kind):
 *   - savings_rate   : savings_rate_snapshots.rate_bps
 *   - term_deposit   : savings_rate_snapshots.rate_bps (product_kind='term_deposit')
 *   - loan_rate      : investment_loan_rates.rate_pct × 100 (converted to bps)
 *   - broker_fee     : brokers.asx_fee_value or us_fee_value (cents or bps)
 *
 * Direction semantics:
 *   - "above": alert when currentValue ≥ threshold  (e.g. savings rate rises)
 *   - "below": alert when currentValue ≤ threshold  (e.g. loan rate falls)
 *
 * Hysteresis (hysteresisBps default = 10bps = 0.10%):
 *   Once an alert fires, the metric must move (hysteresisBps) beyond the
 *   threshold in the "good" direction before re-arming. This prevents
 *   re-fire spam when the metric oscillates at the boundary. The caller
 *   controls re-arm state via lastFiredValue.
 *
 * AFSL: factual comparison of public market data against user-defined
 * threshold. No personalised advice, no investment recommendation. The
 * email copy must remain in the factual/heads-up lane — see cron.
 */

export type AlertDirection = "above" | "below";

export type MetricKind =
  | "savings_rate"
  | "term_deposit"
  | "loan_rate"
  | "broker_fee";

export interface AlertSubscription {
  id: string;
  metric_kind: MetricKind;
  /** Value the metric must cross to fire. Same unit as currentValue (bps). */
  threshold_bps: number;
  /** "above": fire when currentValue ≥ threshold. "below": fire when currentValue ≤ threshold. */
  direction: AlertDirection;
  /** Timestamp of last notification, or null if never fired. */
  last_notified_at: string | null;
  /** Value at which the last notification was fired, or null. */
  last_fired_value_bps: number | null;
  /** Anti-spam frequency window. */
  frequency: "instant" | "daily" | "weekly";
}

export interface ThresholdResult {
  /** Whether the threshold is currently crossed (direction-aware). */
  crossed: boolean;
  /**
   * Whether an alert should actually be sent:
   *   - threshold must be crossed
   *   - must not be within the frequency cooldown window
   *   - must not be within the hysteresis dead-band after last fire
   */
  shouldFire: boolean;
  /** Reason the alert was suppressed (when shouldFire is false). */
  suppressReason?: "not_crossed" | "cooldown" | "hysteresis";
}

/** Default hysteresis band: 10 basis points (0.10%). */
export const DEFAULT_HYSTERESIS_BPS = 10;

/** Cooldown windows in milliseconds. */
const COOLDOWN_MS: Record<AlertSubscription["frequency"], number> = {
  instant: 24 * 60 * 60 * 1000,   // 24 h (even "instant" is once-per-day)
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Evaluate whether an alert should fire.
 *
 * @param sub          The subscription row.
 * @param currentValue Current metric value in basis points.
 * @param nowMs        Current time as milliseconds-since-epoch (injectable for testing).
 * @param hysteresisBps Hysteresis band in basis points (default 10).
 */
export function evaluateThreshold(
  sub: AlertSubscription,
  currentValue: number,
  nowMs: number = Date.now(),
  hysteresisBps: number = DEFAULT_HYSTERESIS_BPS,
): ThresholdResult {
  // 1. Check if threshold is crossed.
  const crossed =
    sub.direction === "above"
      ? currentValue >= sub.threshold_bps
      : currentValue <= sub.threshold_bps;

  if (!crossed) {
    return { crossed: false, shouldFire: false, suppressReason: "not_crossed" };
  }

  // 2. Hysteresis dead-band check.
  // If the alert fired previously and the value has not moved sufficiently
  // away from the threshold + come back, suppress to prevent re-fire spam.
  if (sub.last_fired_value_bps !== null) {
    const reArmThreshold =
      sub.direction === "above"
        ? // "above" alert: re-arm when value drops below (threshold - hysteresisBps)
          sub.threshold_bps - hysteresisBps
        : // "below" alert: re-arm when value rises above (threshold + hysteresisBps)
          sub.threshold_bps + hysteresisBps;

    const hasReArmed =
      sub.direction === "above"
        ? sub.last_fired_value_bps <= reArmThreshold
        : sub.last_fired_value_bps >= reArmThreshold;

    if (!hasReArmed) {
      // Still in the hysteresis band since last fire.
      return { crossed: true, shouldFire: false, suppressReason: "hysteresis" };
    }
  }

  // 3. Cooldown window check.
  if (sub.last_notified_at !== null) {
    const lastMs = new Date(sub.last_notified_at).getTime();
    const cooldownMs = COOLDOWN_MS[sub.frequency] ?? COOLDOWN_MS.instant;
    if (nowMs - lastMs < cooldownMs) {
      return { crossed: true, shouldFire: false, suppressReason: "cooldown" };
    }
  }

  return { crossed: true, shouldFire: true };
}

/**
 * Minimum milliseconds that must elapse between sends for a given frequency.
 * Exported for use by the cron route.
 */
export function minMillisBetweenSends(
  frequency: AlertSubscription["frequency"],
): number {
  return COOLDOWN_MS[frequency] ?? COOLDOWN_MS.instant;
}

/**
 * Human-readable label for a metric kind.
 */
export function metricKindLabel(kind: MetricKind): string {
  switch (kind) {
    case "savings_rate":
      return "savings account rate";
    case "term_deposit":
      return "term deposit rate";
    case "loan_rate":
      return "investment loan rate";
    case "broker_fee":
      return "brokerage fee";
    default:
      return kind;
  }
}

/**
 * URL path to compare the product after the alert fires.
 */
export function metricKindPath(kind: MetricKind): string {
  switch (kind) {
    case "savings_rate":
      return "/savings";
    case "term_deposit":
      return "/term-deposits";
    case "loan_rate":
      return "/investment-loans";
    case "broker_fee":
      return "/";
    default:
      return "/";
  }
}

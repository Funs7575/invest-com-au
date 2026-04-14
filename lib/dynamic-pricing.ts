/**
 * Dynamic lead pricing resolver.
 *
 * Given a base lead price + context (advisor, lead quality, time
 * of day), consults `dynamic_pricing_rules` and applies the
 * highest-priority matching rule. Each rule is a multiplier on
 * the base plus optional floor/cap.
 *
 * Rules are pure-data — the evaluator is pure — so we can unit
 * test without any DB stub. The resolver library handles the
 * DB read with a short in-process cache so the billing path
 * doesn't hammer the rules table.
 *
 * Safety:
 *   - If no rule matches, returns the base price unchanged
 *   - Multiplier is clamped to [0.1, 5.0] at the DB constraint
 *     layer; we clamp here again as a belt-and-braces measure
 *   - Floor and cap are applied AFTER the multiplier so a +50%
 *     surge that hits the cap stays at the cap
 *   - Returns a `reason` string explaining which rule fired so
 *     the billing path can log / audit it
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("dynamic-pricing");

export interface PricingRule {
  id: number;
  name: string;
  advisor_type: string | null;
  vertical: string | null;
  min_quality_score: number | null;
  max_quality_score: number | null;
  time_of_day_start_hour: number | null;
  time_of_day_end_hour: number | null;
  new_advisor_days: number | null;
  multiplier: number;
  floor_cents: number | null;
  cap_cents: number | null;
  priority: number;
  enabled: boolean;
}

export interface PricingContext {
  advisorType?: string | null;
  vertical?: string | null;
  leadQualityScore?: number | null;
  hourLocal?: number | null; // 0-23 in AEST
  advisorAgeDays?: number | null;
}

export interface PricingResult {
  basePriceCents: number;
  finalPriceCents: number;
  multiplier: number;
  ruleName: string | null;
  ruleId: number | null;
  reason: string;
}

/**
 * Pure rule matcher. Returns the winning rule (highest priority
 * that passes every predicate) or null if nothing applies.
 */
export function selectRule(
  rules: PricingRule[],
  context: PricingContext,
): PricingRule | null {
  const candidates = rules
    .filter((r) => r.enabled)
    .filter((r) => matches(r, context));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

function matches(rule: PricingRule, ctx: PricingContext): boolean {
  if (rule.advisor_type && rule.advisor_type !== ctx.advisorType) return false;
  if (rule.vertical && rule.vertical !== ctx.vertical) return false;
  if (
    rule.min_quality_score != null &&
    (ctx.leadQualityScore ?? 0) < rule.min_quality_score
  ) {
    return false;
  }
  if (
    rule.max_quality_score != null &&
    (ctx.leadQualityScore ?? 0) > rule.max_quality_score
  ) {
    return false;
  }
  if (
    rule.time_of_day_start_hour != null &&
    rule.time_of_day_end_hour != null &&
    ctx.hourLocal != null
  ) {
    const start = rule.time_of_day_start_hour;
    const end = rule.time_of_day_end_hour;
    const h = ctx.hourLocal;
    // Wrap-around window (e.g. 22 → 6 overnight)
    const inWindow =
      start <= end
        ? h >= start && h < end
        : h >= start || h < end;
    if (!inWindow) return false;
  }
  if (
    rule.new_advisor_days != null &&
    (ctx.advisorAgeDays == null || ctx.advisorAgeDays > rule.new_advisor_days)
  ) {
    return false;
  }
  return true;
}

/**
 * Apply a rule to a base price. Pure.
 */
export function applyRule(baseCents: number, rule: PricingRule | null): PricingResult {
  if (!rule) {
    return {
      basePriceCents: baseCents,
      finalPriceCents: baseCents,
      multiplier: 1,
      ruleName: null,
      ruleId: null,
      reason: "no_rule_matched",
    };
  }
  const clampedMultiplier = Math.max(0.1, Math.min(5, Number(rule.multiplier) || 1));
  let price = Math.round(baseCents * clampedMultiplier);
  if (rule.floor_cents != null && price < rule.floor_cents) {
    price = rule.floor_cents;
  }
  if (rule.cap_cents != null && price > rule.cap_cents) {
    price = rule.cap_cents;
  }
  return {
    basePriceCents: baseCents,
    finalPriceCents: price,
    multiplier: clampedMultiplier,
    ruleName: rule.name,
    ruleId: rule.id,
    reason: `rule_${rule.id}_${rule.name}`,
  };
}

/**
 * DB-backed wrapper. Caches the full rules set for 60 seconds so
 * the billing path doesn't query every lead.
 */
const CACHE_TTL_MS = 60_000;
let cached: { rows: PricingRule[]; at: number } | null = null;

export async function resolveLeadPrice(
  baseCents: number,
  context: PricingContext,
): Promise<PricingResult> {
  try {
    const now = Date.now();
    if (!cached || now - cached.at > CACHE_TTL_MS) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("dynamic_pricing_rules")
        .select("*")
        .eq("enabled", true);
      if (error) {
        log.warn("dynamic_pricing_rules fetch failed — using base price", {
          error: error.message,
        });
        return applyRule(baseCents, null);
      }
      cached = { rows: (data as PricingRule[]) || [], at: now };
    }
    const rule = selectRule(cached.rows, context);
    return applyRule(baseCents, rule);
  } catch (err) {
    log.warn("resolveLeadPrice threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return applyRule(baseCents, null);
  }
}

export function invalidatePricingCache(): void {
  cached = null;
}

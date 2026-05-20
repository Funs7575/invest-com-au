/**
 * Embed metered SaaS — key verification + quota enforcement (Idea #6).
 *
 * The widget API (/api/widget) calls verifyAndMeter() on each request:
 * hash the presented key → resolve the active embed_customer → check the
 * monthly quota → record usage. Over-quota requests are rejected so
 * billing tiers mean something.
 *
 * Builds on the embed_customer kind + api_key_hash (shipped). The monthly
 * counter on embed_customers is the hot-path cache; embed_usage_events is
 * the source of truth.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

const log = logger("embed-metering");

export type MeterResult =
  | { ok: true; customerId: number; usageThisPeriod: number; quota: number }
  | { ok: false; reason: "invalid_key" | "inactive" | "over_quota" };

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/** Pure: is the current usage period stale (a new calendar month began)? */
export function isPeriodStale(periodStart: string | null, now: number = Date.now()): boolean {
  if (!periodStart) return true;
  const start = new Date(periodStart);
  const nowDate = new Date(now);
  return (
    start.getUTCFullYear() !== nowDate.getUTCFullYear() ||
    start.getUTCMonth() !== nowDate.getUTCMonth()
  );
}

/**
 * Verify a presented API key and meter the request. Resolves the customer
 * by key hash, rolls the monthly counter over if a new month started,
 * enforces the quota, and records a usage event. Best-effort on the event
 * insert (never blocks a within-quota request).
 */
export async function verifyAndMeter(opts: {
  apiKey: string;
  endpoint: string;
}): Promise<MeterResult> {
  const keyHash = hashApiKey(opts.apiKey);
  const supabase = createAdminClient();

  const { data: customer, error } = await supabase
    .from("embed_customers")
    .select("id, status, monthly_quota_requests, usage_this_period, usage_period_start")
    .eq("api_key_hash", keyHash)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !customer) return { ok: false, reason: "invalid_key" };
  if (customer.status !== "active") return { ok: false, reason: "inactive" };

  const quota = customer.monthly_quota_requests as number;
  let used = customer.usage_this_period as number;
  const periodStart = customer.usage_period_start as string;

  // Roll over the counter at month boundaries.
  if (isPeriodStale(periodStart)) {
    used = 0;
    await supabase
      .from("embed_customers")
      .update({ usage_this_period: 0, usage_period_start: new Date().toISOString() })
      .eq("id", customer.id);
  }

  if (used >= quota) {
    return { ok: false, reason: "over_quota" };
  }

  // Increment counter + record the event (best-effort).
  await supabase
    .from("embed_customers")
    .update({ usage_this_period: used + 1 })
    .eq("id", customer.id);
  void supabase.from("embed_usage_events").insert({
    customer_id: customer.id,
    endpoint: opts.endpoint,
    status_code: 200,
  });

  return { ok: true, customerId: customer.id as number, usageThisPeriod: used + 1, quota };
}

export interface EmbedUsageSummary {
  usageThisPeriod: number;
  quota: number;
  periodStart: string | null;
}

/**
 * Read a customer's current-period usage for the portal dashboard.
 */
export async function getEmbedUsage(authUserId: string): Promise<EmbedUsageSummary | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("embed_customers")
      .select("monthly_quota_requests, usage_this_period, usage_period_start")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (!data) return null;
    return {
      usageThisPeriod: (data.usage_this_period as number) ?? 0,
      quota: (data.monthly_quota_requests as number) ?? 0,
      periodStart: (data.usage_period_start as string | null) ?? null,
    };
  } catch (err) {
    log.warn("getEmbedUsage threw", { err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

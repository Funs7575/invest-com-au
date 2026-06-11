/**
 * /api/rate-alerts/manage — tokenised (no-login) preference management for
 * rate-alert subscriptions. Linked from every alert email.
 *
 * Auth model: possession of a subscription's `unsubscribe_token` (delivered
 * only to the subscriber's inbox) proves control of that email address.
 * A valid token can read and manage every subscription belonging to the
 * same (lower-cased) email — the standard manage-preferences contract —
 * but sibling tokens are never echoed back.
 *
 * GET  ?token=…  → { email, items: [...] } or 404 { error: "invalid_token" }
 * POST {token, action, …}
 *        set_frequency  — change frequency (instant | daily | weekly)
 *        pause / resume — toggle product_filters.paused (cron skips paused)
 *        unsubscribe    — delete one subscription
 *        unsubscribe_all— delete every subscription for the email
 *
 * Uses the service-role client: rate_alert_subscriptions has no anon
 * SELECT/UPDATE/DELETE policy by design (anon may only INSERT unverified
 * rows), and these are anonymous, token-authenticated requests with no JWT —
 * the sanctioned service-role scope for anonymous paths (see CLAUDE.md).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("rate-alerts:manage");

const TokenSchema = z.string().min(16).max(200);

const ManageBody = z
  .object({
    token: TokenSchema,
    action: z.enum(["set_frequency", "pause", "resume", "unsubscribe", "unsubscribe_all"]),
    /** Target a sibling subscription of the same email. Defaults to the token's own row. */
    subscription_id: z.string().uuid().optional(),
    /** Required for set_frequency. */
    frequency: z.enum(["instant", "daily", "weekly"]).optional(),
  })
  .refine((body) => body.action !== "set_frequency" || body.frequency !== undefined, {
    message: "frequency is required for set_frequency",
    path: ["frequency"],
  });

interface SubscriptionRow {
  id: string;
  email: string;
  metric_kind: string | null;
  product_kind: string;
  threshold_bps: number;
  direction: string;
  frequency: string;
  broker_slug: string | null;
  lender_slug: string | null;
  product_filters: Record<string, unknown> | null;
  verified: boolean;
  last_notified_at: string | null;
  notification_count: number;
  created_at: string;
}

const SUBSCRIPTION_COLUMNS =
  "id, email, metric_kind, product_kind, threshold_bps, direction, frequency, broker_slug, lender_slug, product_filters, verified, last_notified_at, notification_count, created_at";

/** Public shape — never include tokens. */
function toItem(row: SubscriptionRow) {
  const filters = (row.product_filters ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    metric_kind: row.metric_kind,
    product_kind: row.product_kind,
    threshold_bps: row.threshold_bps,
    direction: row.direction,
    frequency: row.frequency,
    broker_slug: row.broker_slug,
    lender_slug: row.lender_slug,
    mode: filters.mode === "any_change" ? "any_change" : "threshold",
    paused: filters.paused === true,
    verified: row.verified,
    last_notified_at: row.last_notified_at,
    notification_count: row.notification_count,
    created_at: row.created_at,
  };
}

async function resolveToken(
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("rate_alert_subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("unsubscribe_token", token)
    .limit(1)
    .maybeSingle();
  if (error) {
    log.warn("token lookup failed", { err: error.message });
    return null;
  }
  return (data as SubscriptionRow | null) ?? null;
}

// ── GET — list subscriptions for the token's email ────────────────────────────

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`rate_alert_manage_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const tokenParsed = TokenSchema.safeParse(
    new URL(request.url).searchParams.get("token"),
  );
  if (!tokenParsed.success) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const owner = await resolveToken(supabase, tokenParsed.data);
  if (!owner) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Emails are lowercased on insert by both subscribe paths, so an exact
  // match on the lowercased value is the correct sibling lookup. (Not
  // `.ilike()` — `_` and `%` inside an email would act as wildcards.)
  const { data: siblings, error } = await supabase
    .from("rate_alert_subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("email", owner.email.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    log.warn("siblings lookup failed", { err: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({
    email: owner.email,
    items: ((siblings ?? []) as SubscriptionRow[]).map(toItem),
  });
}

// ── POST — mutate preferences ─────────────────────────────────────────────────

export const POST = withValidatedBody(ManageBody, async (request: NextRequest, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`rate_alert_manage:${ip}`, 15, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = createAdminClient();
  const owner = await resolveToken(supabase, body.token);
  if (!owner) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Resolve the target row: the token's own subscription, or a sibling
  // belonging to the same email (case-insensitive).
  let target: SubscriptionRow = owner;
  if (body.subscription_id && body.subscription_id !== owner.id) {
    const { data: sibling, error: siblingErr } = await supabase
      .from("rate_alert_subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("id", body.subscription_id)
      .eq("email", owner.email.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (siblingErr || !sibling) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    target = sibling as SubscriptionRow;
  }

  const nowIso = new Date().toISOString();

  if (body.action === "set_frequency") {
    const { data: updated, error } = await supabase
      .from("rate_alert_subscriptions")
      .update({ frequency: body.frequency, updated_at: nowIso })
      .eq("id", target.id)
      .select(SUBSCRIPTION_COLUMNS)
      .single();
    if (error) {
      log.warn("set_frequency failed", { id: target.id, err: error.message });
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    log.info("rate-alert frequency updated", { id: target.id, frequency: body.frequency });
    return NextResponse.json({ success: true, item: toItem(updated as SubscriptionRow) });
  }

  if (body.action === "pause" || body.action === "resume") {
    const filters = {
      ...((target.product_filters ?? {}) as Record<string, unknown>),
      paused: body.action === "pause",
    };
    const { data: updated, error } = await supabase
      .from("rate_alert_subscriptions")
      .update({ product_filters: filters, updated_at: nowIso })
      .eq("id", target.id)
      .select(SUBSCRIPTION_COLUMNS)
      .single();
    if (error) {
      log.warn(`${body.action} failed`, { id: target.id, err: error.message });
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    log.info(`rate-alert ${body.action}d`, { id: target.id });
    return NextResponse.json({ success: true, item: toItem(updated as SubscriptionRow) });
  }

  if (body.action === "unsubscribe") {
    const { error } = await supabase
      .from("rate_alert_subscriptions")
      .delete()
      .eq("id", target.id);
    if (error) {
      log.warn("unsubscribe failed", { id: target.id, err: error.message });
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    log.info("rate-alert unsubscribed", { id: target.id });
    return NextResponse.json({ success: true, action: "unsubscribed" });
  }

  // unsubscribe_all
  const { data: removed, error } = await supabase
    .from("rate_alert_subscriptions")
    .delete()
    .eq("email", owner.email.toLowerCase())
    .select("id");
  if (error) {
    log.warn("unsubscribe_all failed", { err: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  log.info("rate-alert unsubscribed all", { removed: removed?.length ?? 0 });
  return NextResponse.json({
    success: true,
    action: "unsubscribed_all",
    removed: removed?.length ?? 0,
  });
});

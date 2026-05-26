/**
 * /api/broker-reliability
 *
 * POST — authenticated user submits a micro-survey report about a broker
 *        (platform outage, hidden fees, withdrawal delay, poor support,
 *        or a positive experience report).
 *
 * GET  — public aggregate reliability score for a broker.
 *        Query: ?brokerId=<int>
 *        Returns score, label, component breakdown, and total report count.
 *
 * Rate-limits:
 *   POST — 5 / 10min / IP + 24h dedup per user+broker+event_type
 *   GET  — 60 / min / IP
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { computeBrokerReliability } from "@/lib/broker-reliability";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:broker-reliability");

const EVENT_TYPES = [
  "platform_outage",
  "hidden_fees",
  "withdrawal_delay",
  "poor_support",
  "positive_experience",
] as const;

const PostBody = z.object({
  brokerId: z.coerce.number().int().positive(),
  eventType: z.enum(EVENT_TYPES),
  description: z.string().max(500).nullish(),
});

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(PostBody, async (req: NextRequest, body) => {
  if (
    !(await isAllowed("broker_reliability_post", ipKey(req), { max: 5, refillPerSec: 0.008 }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { brokerId, eventType, description } = body;

  // 24h dedup per user+broker+eventType
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("broker_reliability_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("broker_id", brokerId)
    .eq("event_type", eventType)
    .gte("created_at", since)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You've already reported this event for this broker in the last 24 hours." },
      { status: 409 },
    );
  }

  const { error: insertErr } = await supabase.from("broker_reliability_reports").insert({
    user_id: user.id,
    broker_id: brokerId,
    event_type: eventType,
    description: description ?? null,
    status: "pending",
  });

  if (insertErr) {
    log.warn("reliability report insert failed", { error: insertErr.message });
    return NextResponse.json({ error: "Could not save your report." }, { status: 500 });
  }

  log.info("reliability report submitted", { userId: user.id, brokerId, eventType });
  return NextResponse.json({ ok: true });
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await isAllowed("broker_reliability_get", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(req.url);
  const brokerIdRaw = url.searchParams.get("brokerId");
  const brokerId = brokerIdRaw ? parseInt(brokerIdRaw, 10) : null;

  if (!brokerId || isNaN(brokerId)) {
    return NextResponse.json({ error: "brokerId is required." }, { status: 400 });
  }

  // Use admin client for aggregate cross-user count query on verified reports.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("broker_reliability_reports")
    .select("event_type, user_id")
    .eq("broker_id", brokerId)
    .eq("status", "verified");

  if (error) {
    log.warn("reliability GET failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = data ?? [];
  const totalReporters = new Set(rows.map((r) => r.user_id)).size;

  function countType(t: string) {
    return rows.filter((r) => r.event_type === t).length;
  }

  const inputs = {
    positiveCount: countType("positive_experience"),
    platformOutageCount: countType("platform_outage"),
    hiddenFeesCount: countType("hidden_fees"),
    withdrawalDelayCount: countType("withdrawal_delay"),
    poorSupportCount: countType("poor_support"),
    totalReporters,
  };

  const result = computeBrokerReliability(inputs);

  return NextResponse.json({
    brokerId,
    ...result,
  });
}

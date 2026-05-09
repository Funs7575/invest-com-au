import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("affiliate-click");

export const runtime = "nodejs";

/**
 * POST /api/affiliate/click
 *
 * Body: { broker_slug: string, source?: string }
 *
 * Logs an affiliate click to affiliate_clicks with the broker_id
 * resolved from brokers.slug. Returns { ok: true }. IP is hashed
 * before storage so downstream reporting can still dedupe without
 * storing raw IP (privacy).
 *
 * Rate-limited 60 per minute per IP (normal user flow can fire
 * several clicks per page visit).
 */

const BodySchema = z.object({
  broker_slug: z.string().min(1).max(120),
  source: z.string().max(200).nullish(),
  page: z.string().max(500).nullish(),
  placement_type: z.string().max(200).nullish(),
  utm_source: z.string().max(200).nullish(),
  utm_medium: z.string().max(200).nullish(),
  utm_campaign: z.string().max(200).nullish(),
  scenario: z.string().max(200).nullish(),
  session_id: z.string().max(120).nullish(),
  device_type: z.string().max(40).nullish(),
  layer: z.string().max(200).nullish(),
});

function hashClickIp(ip: string): string {
  // Affiliate-click hashing reverses (salt + ip) ordering vs lib/article-comments
  // hashIp (which uses ip + salt). Different concat → different hash output for
  // the same IP, so click fingerprints don't accidentally cross-reference comment
  // fingerprints. Renamed from hashIp to make this domain isolation explicit.
  const salt = process.env.IP_HASH_SALT ?? "invest-com-au";
  return crypto.createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

export const POST = withValidatedBody(BodySchema, async (req: NextRequest, body) => {
  if (
    !(await isAllowed("affiliate_click", ipKey(req), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  try {
    // admin — click tracking must capture all broker statuses for revenue/editorial analytics
    const supabase = createAdminClient();
    const { data: broker, error: brokerErr } = await supabase
      .from("brokers")
      .select("id, slug, name, status")
      .eq("slug", body.broker_slug)
      .maybeSingle();
    if (brokerErr || !broker) {
      return NextResponse.json(
        { ok: false, error: "Broker not found" },
        { status: 404 },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") ?? null;

    // admin — click tracking must capture all broker statuses for revenue/editorial analytics
    const { error: insertErr } = await supabase.from("affiliate_clicks").insert({
      broker_id: broker.id,
      broker_slug: broker.slug,
      broker_name: broker.name,
      source: body.source ?? null,
      page: body.page ?? null,
      placement_type: body.placement_type ?? null,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      scenario: body.scenario ?? null,
      session_id: body.session_id ?? null,
      device_type: body.device_type ?? null,
      layer: body.layer ?? null,
      user_agent: userAgent,
      ip_hash: ip === "unknown" ? null : hashClickIp(ip),
      clicked_at: new Date().toISOString(),
    });
    if (insertErr) {
      log.error("insert_failed", {
        broker: body.broker_slug,
        error: insertErr.message,
      });
      return NextResponse.json(
        { ok: false, error: "Database error" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("unexpected_error", { err: String(err) });
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
});

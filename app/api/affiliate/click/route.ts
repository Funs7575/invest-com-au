import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

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

interface Body {
  broker_slug: string;
  source?: string | null;
  page?: string | null;
  placement_type?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  scenario?: string | null;
  session_id?: string | null;
  device_type?: string | null;
  layer?: string | null;
}

function parse(input: unknown): { ok: true; data: Body } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const b = input as Record<string, unknown>;
  const broker_slug = typeof b.broker_slug === "string" ? b.broker_slug.trim() : "";
  if (!broker_slug || broker_slug.length > 120) {
    return { ok: false, error: "Invalid broker_slug" };
  }
  const str = (k: string, max = 200): string | null => {
    const v = b[k];
    return typeof v === "string" && v.length <= max ? v.trim() || null : null;
  };
  return {
    ok: true,
    data: {
      broker_slug,
      source: str("source"),
      page: str("page", 500),
      placement_type: str("placement_type"),
      utm_source: str("utm_source"),
      utm_medium: str("utm_medium"),
      utm_campaign: str("utm_campaign"),
      scenario: str("scenario"),
      session_id: str("session_id", 120),
      device_type: str("device_type", 40),
      layer: str("layer"),
    },
  };
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "invest-com-au";
  return crypto.createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const v = parse(raw);
  if (!v.ok) {
    return NextResponse.json(
      { ok: false, error: v.error },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: broker, error: brokerErr } = await supabase
      .from("brokers")
      .select("id, slug, name, status")
      .eq("slug", v.data.broker_slug)
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

    const { error: insertErr } = await supabase.from("affiliate_clicks").insert({
      broker_id: broker.id,
      broker_slug: broker.slug,
      broker_name: broker.name,
      source: v.data.source,
      page: v.data.page,
      placement_type: v.data.placement_type,
      utm_source: v.data.utm_source,
      utm_medium: v.data.utm_medium,
      utm_campaign: v.data.utm_campaign,
      scenario: v.data.scenario,
      session_id: v.data.session_id,
      device_type: v.data.device_type,
      layer: v.data.layer,
      user_agent: userAgent,
      ip_hash: ip === "unknown" ? null : hashIp(ip),
      clicked_at: new Date().toISOString(),
    });
    if (insertErr) {
      log.error("insert_failed", {
        broker: v.data.broker_slug,
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
}

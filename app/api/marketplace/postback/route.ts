import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/marketplace/postback
 * Broker conversion postback endpoint.
 * Authenticated via X-API-Key header matching broker_accounts.postback_api_key.
 *
 * Body: {
 *   click_id: string (UUID),
 *   event_type: 'opened' | 'funded' | 'first_trade' | 'custom',
 *   conversion_value_cents?: number,
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-API-Key header" },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up broker by API key
  const { data: account } = await supabase
    .from("broker_accounts")
    .select("broker_slug, status")
    .eq("postback_api_key", apiKey)
    .maybeSingle();

  if (!account || account.status !== "active") {
    return NextResponse.json(
      { error: "Invalid or inactive API key" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { click_id, event_type, conversion_value_cents, metadata } = body as {
    click_id?: string;
    event_type?: string;
    conversion_value_cents?: number;
    metadata?: Record<string, unknown>;
  };

  // Validate required fields
  if (!click_id || typeof click_id !== "string") {
    return NextResponse.json(
      { error: "click_id is required (UUID)" },
      { status: 400 }
    );
  }

  const validTypes = ["opened", "funded", "first_trade", "custom"];
  if (!event_type || !validTypes.includes(event_type)) {
    return NextResponse.json(
      { error: `event_type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate click_id exists and belongs to this broker
  const { data: click } = await supabase
    .from("affiliate_clicks")
    .select("click_id, broker_slug")
    .eq("click_id", click_id)
    .maybeSingle();

  if (!click) {
    return NextResponse.json(
      { error: "click_id not found" },
      { status: 404 }
    );
  }

  if (click.broker_slug !== account.broker_slug) {
    return NextResponse.json(
      { error: "click_id does not belong to your broker" },
      { status: 403 }
    );
  }

  // Find associated campaign (if any) via campaign_events
  const { data: campaignEvent } = await supabase
    .from("campaign_events")
    .select("campaign_id")
    .eq("click_id", click_id)
    .eq("event_type", "click")
    .limit(1)
    .maybeSingle();

  // Get IP hash for fraud detection
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const { createHash } = await import("crypto");
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  const ipHash = createHash("sha256")
    .update(salt + ip)
    .digest("hex")
    .slice(0, 16);

  // Insert conversion event
  const { data: conversion, error } = await supabase
    .from("conversion_events")
    .insert({
      click_id,
      broker_slug: account.broker_slug,
      campaign_id: campaignEvent?.campaign_id || null,
      event_type,
      conversion_value_cents:
        typeof conversion_value_cents === "number"
          ? conversion_value_cents
          : 0,
      metadata: metadata || {},
      source: "postback",
      ip_hash: ipHash,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Postback insert error:", error.message);
    return NextResponse.json(
      { error: "Failed to record conversion" },
      { status: 500 }
    );
  }

  // Enqueue outbound webhook delivery if broker has a webhook_url configured
  try {
    const { data: brokerWebhook } = await supabase
      .from("broker_accounts")
      .select("webhook_url")
      .eq("broker_slug", account.broker_slug)
      .not("webhook_url", "is", null)
      .limit(1)
      .maybeSingle();

    if (brokerWebhook?.webhook_url) {
      await supabase.from("webhook_delivery_queue").insert({
        conversion_event_id: conversion?.id,
        broker_slug: account.broker_slug,
        webhook_url: brokerWebhook.webhook_url,
        payload: {
          event: "conversion",
          conversion_id: conversion?.id,
          click_id,
          event_type,
          conversion_value_cents: typeof conversion_value_cents === "number" ? conversion_value_cents : 0,
          metadata: metadata || {},
          timestamp: conversion?.created_at,
        },
      });
    }
  } catch {
    // Webhook enqueue is non-critical — don't fail the postback
  }

  // Update campaign_daily_stats conversions count if we have a campaign
  if (campaignEvent?.campaign_id) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("campaign_daily_stats")
      .select("id, conversions")
      .eq("campaign_id", campaignEvent.campaign_id)
      .eq("stat_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("campaign_daily_stats")
        .update({ conversions: (existing.conversions || 0) + 1 })
        .eq("id", existing.id);
    }
  }

  return NextResponse.json({
    success: true,
    conversion_id: conversion?.id,
    created_at: conversion?.created_at,
  });
}

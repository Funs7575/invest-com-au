import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "crypto";

const log = logger("broker-signup-postback");

/**
 * POST /api/webhooks/broker-signup
 *
 * Accepts conversion postbacks from broker affiliate networks.
 * Called when a user signs up at a broker after clicking our affiliate link.
 *
 * Expected payload:
 * {
 *   click_id: string,          // Our click_id from the redirect URL
 *   broker_slug?: string,      // Optional: broker identifier
 *   external_ref?: string,     // Broker's conversion ID
 *   revenue_cents?: number,    // Commission amount in cents
 *   commission_type?: string,  // 'cpa' | 'revshare' | 'hybrid'
 * }
 *
 * Auth: Bearer token via PARTNER_API_KEY or dedicated POSTBACK_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.POSTBACK_SECRET || process.env.PARTNER_API_KEY;

    if (!authHeader || !expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const a = Buffer.from(token);
      const b = Buffer.from(expectedKey);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { click_id, broker_slug, external_ref, revenue_cents, commission_type } = body;

    if (!click_id && !broker_slug) {
      return NextResponse.json(
        { error: "click_id or broker_slug is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Look up the original click for attribution
    let resolvedBrokerSlug = broker_slug;
    let resolvedBrokerId: number | null = null;
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;

    if (click_id) {
      const { data: click } = await supabase
        .from("affiliate_clicks")
        .select("broker_id, broker_slug, source, page")
        .eq("click_id", click_id)
        .single();

      if (click) {
        resolvedBrokerSlug = click.broker_slug;
        resolvedBrokerId = click.broker_id;
        // Extract UTM from the source page if available
        try {
          const url = new URL(click.page);
          utmSource = url.searchParams.get("utm_source");
          utmMedium = url.searchParams.get("utm_medium");
          utmCampaign = url.searchParams.get("utm_campaign");
        } catch {
          // page may not be a full URL
        }
      }
    }

    // If we still don't have broker_id, look it up
    if (!resolvedBrokerId && resolvedBrokerSlug) {
      const { data: broker } = await supabase
        .from("brokers")
        .select("id")
        .eq("slug", resolvedBrokerSlug)
        .single();
      resolvedBrokerId = broker?.id || null;
    }

    if (!resolvedBrokerSlug) {
      return NextResponse.json(
        { error: "Could not resolve broker from click_id or broker_slug" },
        { status: 400 }
      );
    }

    // Check for duplicate postbacks
    if (external_ref) {
      const { data: existing } = await supabase
        .from("broker_signups")
        .select("id")
        .eq("external_ref", external_ref)
        .eq("broker_slug", resolvedBrokerSlug)
        .maybeSingle();

      if (existing) {
        log.info("Duplicate postback ignored", { external_ref, broker_slug: resolvedBrokerSlug });
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    // Insert the signup record
    const { data: signup, error } = await supabase
      .from("broker_signups")
      .insert({
        broker_id: resolvedBrokerId,
        broker_slug: resolvedBrokerSlug,
        click_id: click_id || null,
        revenue_cents: revenue_cents || 0,
        commission_type: commission_type || "cpa",
        status: "pending",
        source: "postback",
        external_ref: external_ref || null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .select("id")
      .single();

    if (error) {
      log.error("Failed to record signup", { error: error.message });
      return NextResponse.json({ error: "Failed to record signup" }, { status: 500 });
    }

    log.info("Broker signup recorded", {
      signup_id: signup?.id,
      broker_slug: resolvedBrokerSlug,
      click_id,
      revenue_cents,
    });

    return NextResponse.json({ ok: true, signup_id: signup?.id });
  } catch (err) {
    log.error("Postback error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/broker-signup?click_id=xxx&broker=yyy&amount=zzz
 *
 * Alternative GET-based postback for networks that use pixel/redirect callbacks.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const click_id = searchParams.get("click_id");
  const broker_slug = searchParams.get("broker");
  const external_ref = searchParams.get("ref");
  const amount = searchParams.get("amount");

  if (!click_id && !broker_slug) {
    return new NextResponse("Missing click_id or broker", { status: 400 });
  }

  // Convert to POST-style body and delegate
  const fakeRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      click_id,
      broker_slug,
      external_ref,
      revenue_cents: amount ? Math.round(parseFloat(amount) * 100) : 0,
    }),
  });

  return POST(fakeRequest);
}

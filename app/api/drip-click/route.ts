import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limiter";

const isRateLimited = createRateLimiter(60_000, 20); // 20 clicks per minute per IP

/**
 * GET /api/drip-click?email=xxx&drip=4&broker=commsec
 *
 * Tracks drip email affiliate clicks in `drip_affiliate_clicks`,
 * then redirects to /go/{broker} with UTM params for full
 * affiliate click attribution via the existing go-redirect handler.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const dripStr = req.nextUrl.searchParams.get("drip");
  const broker = req.nextUrl.searchParams.get("broker");

  // Validate required params
  if (!broker || !dripStr) {
    return NextResponse.redirect(new URL("/compare", req.url), 302);
  }

  const dripNumber = parseInt(dripStr, 10);
  if (isNaN(dripNumber)) {
    return NextResponse.redirect(new URL("/compare", req.url), 302);
  }

  // Rate limit by IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (isRateLimited(ip)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  // Record click in drip_affiliate_clicks
  try {
    const supabase = createAdminClient();
    await supabase.from("drip_affiliate_clicks").insert({
      email: email?.toLowerCase().trim().slice(0, 254) || "unknown",
      drip_number: dripNumber,
      broker_slug: broker.slice(0, 100),
      clicked_at: new Date().toISOString(),
    });

    // Also update investor_drip_log with clicked_at timestamp
    if (email) {
      await supabase
        .from("investor_drip_log")
        .update({ clicked_at: new Date().toISOString() })
        .eq("email", email.toLowerCase().trim())
        .eq("drip_number", dripNumber)
        .is("clicked_at", null);
    }
  } catch {
    // Non-blocking: click tracking failure should not prevent redirect
  }

  // Redirect to /go/{broker} with drip UTM params
  const destination = new URL(
    `/go/${encodeURIComponent(broker)}`,
    req.url
  );
  destination.searchParams.set("utm_source", "drip");
  destination.searchParams.set("utm_medium", "email");
  destination.searchParams.set(
    "utm_campaign",
    `broker_drip_${dripNumber}`
  );

  const response = NextResponse.redirect(destination.toString(), 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

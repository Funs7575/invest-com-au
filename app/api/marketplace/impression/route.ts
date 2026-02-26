import { NextRequest, NextResponse } from "next/server";
import { recordImpression } from "@/lib/marketplace/allocation";

// In-memory rate limiter (per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60; // max 60 impressions per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/**
 * POST /api/marketplace/impression
 * Records a campaign impression (viewability-tracked, fired from ImpressionTracker).
 *
 * Body: { campaign_id, broker_slug, page, placement }
 *
 * Impressions are free (cost_cents = 0) — they're logged for analytics
 * and frequency capping purposes only.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, broker_slug, page, placement } = body;

    if (!campaign_id || !broker_slug) {
      return NextResponse.json(
        { error: "campaign_id and broker_slug are required" },
        { status: 400 }
      );
    }

    // Rate limit check
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Detect device type from user agent
    const ua = req.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    const isTablet = /ipad|tablet/i.test(ua);
    const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

    await recordImpression(campaign_id, broker_slug, page || undefined, {
      scenario: placement || undefined,
      device_type: deviceType,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

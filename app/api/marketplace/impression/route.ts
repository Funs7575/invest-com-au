import { NextRequest, NextResponse } from "next/server";
import { recordImpression } from "@/lib/marketplace/allocation";

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

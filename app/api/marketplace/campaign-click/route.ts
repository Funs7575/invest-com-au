import { createAdminClient } from "@/lib/supabase/admin";
import { recordCpcClick } from "@/lib/marketplace/allocation";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limiter";
import { hashIP } from "@/lib/hash-ip";

const log = logger("campaign-click");

export const runtime = "nodejs";

const isRateLimited = createRateLimiter(60_000, 10); // 10 CPC clicks per minute per IP

/**
 * POST /api/marketplace/campaign-click
 * Records a CPC click event, debits the broker's wallet, and updates campaign spend.
 * Called from the /go/[slug] redirect route when a campaign_id (cid) is present.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaign_id,
      broker_slug,
      rate_cents,
      click_id,
      page,
      session_id,
    } = body;

    if (!campaign_id || !broker_slug || !rate_cents) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    // Rate limit check — prevent click-bomb attacks
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const success = await recordCpcClick(
      campaign_id,
      broker_slug,
      rate_cents,
      {
        click_id,
        page,
        ip_hash: hashIP(ip),
        user_agent: userAgent.slice(0, 500),
        session_id,
      }
    );

    if (!success) {
      return NextResponse.json({ error: "Insufficient funds", billed: false }, { status: 402 });
    }

    return NextResponse.json({ success: true, billed: true });
  } catch (err) {
    log.error("Campaign click error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}

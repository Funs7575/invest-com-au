
import { recordCpcClick } from "@/lib/marketplace/allocation";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limiter";

const log = logger("campaign-click");

export const runtime = "nodejs";

const isRateLimited = createRateLimiter(60_000, 10); // 10 CPC clicks per minute per IP

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  if (!process.env.IP_HASH_SALT) log.warn("IP_HASH_SALT not set — using default. Set this env var in production.");
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

// Tracking call originating from the /go/[slug] redirect. Fields are
// validated/guarded individually below; the schema is permissive so we never
// reject a currently-valid request, and `.passthrough()` keeps any extra
// redirect params intact.
const Body = z
  .object({
    // campaign_id/rate_cents arrive from query-param-derived client values and
    // were previously passed through untyped — accept string or number so no
    // currently-valid request is rejected; they're cast at the call site below
    // exactly as the prior `any` body did.
    campaign_id: z.union([z.string(), z.number()]).optional(),
    broker_slug: z.string().optional(),
    rate_cents: z.union([z.string(), z.number()]).optional(),
    click_id: z.string().optional(),
    page: z.string().optional(),
    session_id: z.string().optional(),
  })
  .passthrough();

/**
 * POST /api/marketplace/campaign-click
 * Records a CPC click event, debits the broker's wallet, and updates campaign spend.
 * Called from the /go/[slug] redirect route when a campaign_id (cid) is present.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = Body.safeParse(await request.json());
    const {
      campaign_id,
      broker_slug,
      rate_cents,
      click_id,
      page,
      session_id,
    } = parsed.success ? parsed.data : {};

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
      campaign_id as number,
      broker_slug,
      rate_cents as number,
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

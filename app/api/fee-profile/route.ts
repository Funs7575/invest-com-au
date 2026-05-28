import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("fee-profile");

const FeeProfileBody = z.object({
  asx_trades_per_month: z.coerce.number().int().min(0).max(999).default(4),
  us_trades_per_month: z.coerce.number().int().min(0).max(999).default(0),
  avg_trade_size: z.coerce.number().int().min(0).max(9_999_999).default(5000),
  portfolio_value: z.coerce.number().int().min(0).max(99_999_999).nullable().optional(),
  current_broker_slug: z.string().max(100).nullable().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("fee_profiles")
      .select("user_id, asx_trades_per_month, us_trades_per_month, avg_trade_size, portfolio_value, current_broker_slug, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ profile });
  } catch (err) {
    log.error("Fee profile GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export const POST = withValidatedBody(FeeProfileBody, async (request: NextRequest, body) => {
  try {
    if (!(await isAllowed("fee_profile", ipKey(request), { max: 20, refillPerSec: 20 / 3600 }))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check Pro subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        { error: "Pro subscription required" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("fee_profiles").upsert(
      {
        user_id: user.id,
        asx_trades_per_month: body.asx_trades_per_month,
        us_trades_per_month: body.us_trades_per_month,
        avg_trade_size: body.avg_trade_size,
        portfolio_value: body.portfolio_value ?? null,
        current_broker_slug: body.current_broker_slug ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      log.error("Fee profile upsert error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Fee profile POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
});

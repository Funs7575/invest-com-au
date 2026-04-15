import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("fee-profile");

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

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate inputs
    const asxTrades = Math.max(0, Math.min(999, Math.round(Number(body.asx_trades_per_month) || 4)));
    const usTrades = Math.max(0, Math.min(999, Math.round(Number(body.us_trades_per_month) || 0)));
    const avgTradeSize = Math.max(0, Math.min(9999999, Math.round(Number(body.avg_trade_size) || 5000)));
    const portfolioValue = body.portfolio_value
      ? Math.max(0, Math.min(99999999, Math.round(Number(body.portfolio_value))))
      : null;
    const currentBrokerSlug =
      typeof body.current_broker_slug === "string"
        ? body.current_broker_slug.slice(0, 100)
        : null;

    const { error } = await supabase.from("fee_profiles").upsert(
      {
        user_id: user.id,
        asx_trades_per_month: asxTrades,
        us_trades_per_month: usTrades,
        avg_trade_size: avgTradeSize,
        portfolio_value: portfolioValue,
        current_broker_slug: currentBrokerSlug,
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
}

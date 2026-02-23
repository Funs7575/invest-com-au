import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Fee profile GET error:", err);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      console.error("Fee profile upsert error:", error.message);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Fee profile POST error:", err);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}

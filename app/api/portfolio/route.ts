import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * GET /api/portfolio?email=xxx — get portfolio by email
 * POST /api/portfolio — create or update portfolio
 */

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: portfolio } = await supabase
    .from("user_portfolios")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!portfolio) return NextResponse.json({ portfolio: null });

  // Get unread alerts
  const { data: alerts } = await supabase
    .from("portfolio_alerts")
    .select("*")
    .eq("portfolio_id", portfolio.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ portfolio, alerts: alerts || [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, holdings } = body;

    if (!email || !holdings || !Array.isArray(holdings)) {
      return NextResponse.json({ error: "Email and holdings required" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    if (await isRateLimited(`portfolio:${ip}`, 10, 5)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createAdminClient();

    // Get broker fee data for calculations
    const brokerSlugs = holdings.map((h: { broker_slug: string }) => h.broker_slug).filter(Boolean);
    const { data: brokers } = await supabase
      .from("brokers")
      .select("slug, name, asx_fee_value, us_fee_value, fx_rate, inactivity_fee, platform_type, rating")
      .in("slug", brokerSlugs);

    const brokerMap = new Map((brokers || []).map(b => [b.slug, b]));

    // Calculate current annual fees
    let totalFees = 0;
    const enrichedHoldings = holdings.map((h: { broker_slug: string; balance: number; trades_per_year?: number; us_allocation?: number }) => {
      const broker = brokerMap.get(h.broker_slug);
      if (!broker) return { ...h, annual_fee: 0 };

      const trades = h.trades_per_year || 24;
      const balance = h.balance || 0;
      const usAlloc = (h.us_allocation || 30) / 100;

      // ASX cost
      const asxTrades = Math.round(trades * (1 - usAlloc));
      const asxCost = asxTrades * (broker.asx_fee_value || 0);

      // US cost
      const usTrades = trades - asxTrades;
      const usCost = usTrades * (broker.us_fee_value || 0);

      // FX cost on US trades
      const avgTradeSize = balance > 0 ? balance / trades : 2000;
      const fxCost = usTrades * avgTradeSize * ((broker.fx_rate || 0) / 100);

      // Inactivity fee
      const inactivity = broker.inactivity_fee || 0;

      const annualFee = Math.round(asxCost + usCost + fxCost + inactivity);
      totalFees += annualFee;

      return { ...h, annual_fee: annualFee, broker_name: broker.name };
    });

    // Find optimal broker (lowest total cost)
    const { data: allBrokers } = await supabase
      .from("brokers")
      .select("slug, name, asx_fee_value, us_fee_value, fx_rate, inactivity_fee, rating")
      .eq("status", "active")
      .eq("platform_type", "share_broker")
      .order("asx_fee_value", { ascending: true })
      .limit(5);

    let optimalFees = totalFees;
    let optimalSlug = "";

    for (const ob of allBrokers || []) {
      let cost = 0;
      for (const h of holdings) {
        const trades = h.trades_per_year || 24;
        const balance = h.balance || 0;
        const usAlloc = (h.us_allocation || 30) / 100;
        const asxTrades = Math.round(trades * (1 - usAlloc));
        const usTrades = trades - asxTrades;
        const avgTradeSize = balance > 0 ? balance / trades : 2000;

        cost += asxTrades * (ob.asx_fee_value || 0);
        cost += usTrades * (ob.us_fee_value || 0);
        cost += usTrades * avgTradeSize * ((ob.fx_rate || 0) / 100);
        cost += ob.inactivity_fee || 0;
      }
      if (cost < optimalFees) {
        optimalFees = Math.round(cost);
        optimalSlug = ob.slug;
      }
    }

    const savings = totalFees - optimalFees;

    // Upsert portfolio
    const { data: existing } = await supabase
      .from("user_portfolios")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    const portfolioData = {
      email: email.toLowerCase().trim(),
      name: name?.trim().replace(/[\r\n]/g, "").slice(0, 100) || null,
      holdings: enrichedHoldings,
      total_balance_cents: Math.round(holdings.reduce((s: number, h: { balance: number }) => s + (h.balance || 0), 0) * 100),
      annual_fees_cents: totalFees * 100,
      optimal_fees_cents: optimalFees * 100,
      savings_cents: savings * 100,
      optimal_broker_slug: optimalSlug || null,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let portfolioId: number;

    if (existing) {
      await supabase.from("user_portfolios").update(portfolioData).eq("id", existing.id);
      portfolioId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("user_portfolios")
        .insert(portfolioData)
        .select("id")
        .single();
      portfolioId = created?.id || 0;
    }

    return NextResponse.json({
      portfolio_id: portfolioId,
      annual_fees: totalFees,
      optimal_fees: optimalFees,
      savings,
      optimal_broker: optimalSlug,
      holdings: enrichedHoldings,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save portfolio" }, { status: 500 });
  }
}

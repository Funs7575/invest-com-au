import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/partner/status
 *
 * Simple status check endpoint for partners.
 * Returns account status, remaining credits, and total leads delivered.
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.nextUrl.searchParams.get("api_key");

    // ── Auth: validate partner API key ──
    if (!apiKey || apiKey !== process.env.PARTNER_API_KEY) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    const supabase = await createClient();

    // ── Count total leads delivered via partner API ──
    const { count: leadsDelivered, error: countError } = await supabase
      .from("professional_leads")
      .select("id", { count: "exact", head: true })
      .eq("source_page", "partner_api");

    if (countError) {
      console.error("Failed to count partner leads:", countError);
      return NextResponse.json(
        { error: "Failed to retrieve status." },
        { status: 500 },
      );
    }

    // ── Sum remaining credit across all advisors (partner-level view) ──
    // In a more advanced setup this would query a partner_accounts table;
    // for now we report aggregate advisor credit and total deliveries.
    const { data: creditData, error: creditError } = await supabase
      .from("professionals")
      .select("credit_balance_cents")
      .eq("status", "active");

    let creditsRemaining = 0;
    if (!creditError && creditData) {
      creditsRemaining = creditData.reduce(
        (sum, row) => sum + (row.credit_balance_cents || 0),
        0,
      );
    }

    return NextResponse.json({
      active: true,
      credits_remaining: creditsRemaining,
      leads_delivered_total: leadsDelivered || 0,
    });
  } catch (error) {
    console.error("Partner status API error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

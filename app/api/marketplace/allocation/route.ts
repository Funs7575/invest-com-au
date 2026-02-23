import { getWinningCampaigns, AllocationContext } from "@/lib/marketplace/allocation";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/marketplace/allocation?placement=compare-top&brokers=commsec,stake
 * Returns the winning campaign(s) for a given placement.
 * Used by client components to resolve real-time allocation.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement");

    if (!placement) {
      return NextResponse.json({ error: "Missing placement parameter" }, { status: 400 });
    }

    const page = searchParams.get("page");
    const scenario = searchParams.get("scenario");

    const brokersParam = searchParams.get("brokers");
    const brokerSlugs = brokersParam
      ? brokersParam.split(",").filter(Boolean)
      : undefined;

    const winners = await getWinningCampaigns(placement, brokerSlugs, {
      page: page || undefined,
      scenario: scenario || undefined,
    });

    return NextResponse.json({
      placement,
      winners,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        // Cache for 30 seconds to reduce load but keep reasonably fresh
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Allocation error:", err);
    return NextResponse.json({ error: "Allocation failed" }, { status: 500 });
  }
}

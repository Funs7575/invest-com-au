import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { CURRENT_YEAR } from "@/lib/seo";

const log = logger("broker-health");

/**
 * Calculate a safety score (0-100) based on broker attributes.
 *
 * Scoring factors:
 * - ASIC regulated:        +25
 * - Holds AFSL:            +10
 * - AUSTRAC (crypto):      +5
 * - International reg:     +5
 * - CHESS sponsored:       +20
 * - Years operating:       up to +20
 * - Editorial rating:      up to +10
 * - AU platform type:      +5
 * - HQ jurisdiction:       up to +5
 */
function calculateSafetyScore(broker: Record<string, unknown>): {
  score: number;
  factors: { label: string; points: number; max: number }[];
} {
  const factors: { label: string; points: number; max: number }[] = [];
  let score = 0;

  // Regulatory
  const regulated = (broker.regulated_by as string) || "";
  const regLower = regulated.toLowerCase();

  const asicPoints = regLower.includes("asic") ? 25 : 0;
  factors.push({ label: "ASIC regulated", points: asicPoints, max: 25 });
  score += asicPoints;

  const afslPoints =
    regLower.includes("afsl") || regLower.includes("afs licence") ? 10 : 0;
  factors.push({ label: "Holds AFSL", points: afslPoints, max: 10 });
  score += afslPoints;

  if (broker.is_crypto) {
    const austracPoints = regLower.includes("austrac") ? 5 : 0;
    factors.push({
      label: "AUSTRAC registered",
      points: austracPoints,
      max: 5,
    });
    score += austracPoints;
  }

  const intlRegPoints =
    regLower.includes("fca") ||
    regLower.includes("sec") ||
    regLower.includes("mas")
      ? 5
      : 0;
  factors.push({
    label: "International regulator",
    points: intlRegPoints,
    max: 5,
  });
  score += intlRegPoints;

  // CHESS
  const chessPoints = broker.chess_sponsored ? 20 : 0;
  factors.push({ label: "CHESS sponsored", points: chessPoints, max: 20 });
  score += chessPoints;

  // Years operating
  let yearsPoints = 0;
  const yearFounded = broker.year_founded as number | null;
  if (yearFounded) {
    const yearsOp = CURRENT_YEAR - yearFounded;
    if (yearsOp >= 20) yearsPoints = 20;
    else if (yearsOp >= 10) yearsPoints = 15;
    else if (yearsOp >= 5) yearsPoints = 10;
    else if (yearsOp >= 2) yearsPoints = 5;
  }
  factors.push({ label: "Years operating", points: yearsPoints, max: 20 });
  score += yearsPoints;

  // Rating
  let ratingPoints = 0;
  const rating = broker.rating as number | null;
  if (rating) {
    if (rating >= 4.5) ratingPoints = 10;
    else if (rating >= 4.0) ratingPoints = 8;
    else if (rating >= 3.5) ratingPoints = 5;
    else if (rating >= 3.0) ratingPoints = 3;
  }
  factors.push({ label: "Editorial rating", points: ratingPoints, max: 10 });
  score += ratingPoints;

  // Platform type
  const typePoints = broker.platform_type === "share_broker" ? 5 : 0;
  factors.push({
    label: "Share broker platform",
    points: typePoints,
    max: 5,
  });
  score += typePoints;

  // HQ jurisdiction
  let hqPoints = 0;
  const hq = ((broker.headquarters as string) || "").toLowerCase();
  if (
    hq.includes("australia") ||
    hq.includes("sydney") ||
    hq.includes("melbourne")
  )
    hqPoints = 5;
  else if (
    hq.includes("uk") ||
    hq.includes("london") ||
    hq.includes("united states") ||
    hq.includes("new york")
  )
    hqPoints = 4;
  else if (hq.includes("singapore") || hq.includes("hong kong"))
    hqPoints = 3;
  factors.push({ label: "HQ jurisdiction", points: hqPoints, max: 5 });
  score += hqPoints;

  return { score: Math.min(score, 100), factors };
}

/**
 * GET /api/broker-health?slug=xxx
 * Public endpoint returning safety score and breakdown for a broker.
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "slug query parameter is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: broker, error: dbError } = await admin
      .from("brokers")
      .select(
        "slug, name, rating, regulated_by, year_founded, headquarters, chess_sponsored, is_crypto, platform_type"
      )
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (dbError || !broker) {
      return NextResponse.json(
        { error: "Broker not found." },
        { status: 404 }
      );
    }

    const { score, factors } = calculateSafetyScore(broker);

    const label =
      score >= 80 ? "Strong" : score >= 50 ? "Moderate" : "Caution";

    return NextResponse.json(
      {
        slug: broker.slug,
        name: broker.name,
        safety_score: score,
        safety_label: label,
        factors,
        metadata: {
          regulated_by: broker.regulated_by,
          year_founded: broker.year_founded,
          headquarters: broker.headquarters,
          chess_sponsored: broker.chess_sponsored,
          is_crypto: broker.is_crypto,
          platform_type: broker.platform_type,
          rating: broker.rating,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    log.error("Broker health error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to calculate broker health." },
      { status: 500 }
    );
  }
}

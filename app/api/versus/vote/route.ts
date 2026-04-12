import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/versus/vote — Cast a community vote on a broker vs broker comparison.
 * GET  /api/versus/vote?a=slug&b=slug — Get current vote counts for a pair.
 *
 * Deduplication: one vote per broker pair per IP (hashed).
 */

function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + (process.env.VOTE_SALT || "invest-com-au-salt"))
    .digest("hex")
    .slice(0, 32);
}

function normalisePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawA = params.get("a");
  const rawB = params.get("b");

  if (!rawA || !rawB) {
    return NextResponse.json(
      { error: "Query params 'a' and 'b' are required" },
      { status: 400 }
    );
  }

  const [brokerA, brokerB] = normalisePair(rawA, rawB);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("versus_votes")
    .select("chosen_slug")
    .eq("broker_a_slug", brokerA)
    .eq("broker_b_slug", brokerB);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch votes" }, { status: 500 });
  }

  const votes = data || [];
  const countA = votes.filter((v) => v.chosen_slug === rawA).length;
  const countB = votes.filter((v) => v.chosen_slug === rawB).length;
  const total = countA + countB;

  return NextResponse.json({
    [rawA]: countA,
    [rawB]: countB,
    total,
    percent_a: total > 0 ? Math.round((countA / total) * 100) : 50,
    percent_b: total > 0 ? Math.round((countB / total) * 100) : 50,
  }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { broker_a_slug, broker_b_slug, chosen_slug } = body as {
      broker_a_slug: string;
      broker_b_slug: string;
      chosen_slug: string;
    };

    if (!broker_a_slug || !broker_b_slug || !chosen_slug) {
      return NextResponse.json(
        { error: "broker_a_slug, broker_b_slug, and chosen_slug are required" },
        { status: 400 }
      );
    }

    // Chosen must be one of the two
    if (chosen_slug !== broker_a_slug && chosen_slug !== broker_b_slug) {
      return NextResponse.json(
        { error: "chosen_slug must be one of broker_a_slug or broker_b_slug" },
        { status: 400 }
      );
    }

    // Normalise the pair for consistent storage
    const [normA, normB] = normalisePair(broker_a_slug, broker_b_slug);

    // Hash IP for dedup
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ipHash = hashIp(ip);

    const supabase = createAdminClient();

    // Check for existing vote from this IP on this pair
    const { data: existing } = await supabase
      .from("versus_votes")
      .select("id")
      .eq("broker_a_slug", normA)
      .eq("broker_b_slug", normB)
      .eq("ip_hash", ipHash)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "You have already voted on this comparison" },
        { status: 409 }
      );
    }

    // Insert vote
    const { error } = await supabase.from("versus_votes").insert({
      broker_a_slug: normA,
      broker_b_slug: normB,
      chosen_slug,
      ip_hash: ipHash,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Vote insert error:", error.message);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

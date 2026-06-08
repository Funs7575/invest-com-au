import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export async function GET(request: NextRequest) {
  if (!(await isAllowed("advisor_reviews_public", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const professionalId = parseInt(url.searchParams.get("professional_id") ?? "", 10);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

  if (!Number.isFinite(professionalId)) {
    return NextResponse.json({ error: "Missing professional_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_reviews")
    .select("*, advisor_response:professional_review_responses(id, body, created_at, updated_at)")
    .eq("professional_id", professionalId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });

  return NextResponse.json({ reviews: data ?? [] });
}

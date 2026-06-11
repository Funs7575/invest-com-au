import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("advisor-reviews-public");

// Page size ceiling — keep the public reviews endpoint cheap and predictable.
const MAX_LIMIT = 20;

// GET query params validated via safeParse (per repo convention). Coerce-and-
// clamp rather than reject: a bad `offset`/`limit` falls back to a safe default
// so the "Load more reviews" affordance never 400s on a malformed page cursor.
// `professional_id` is the only hard requirement.
const QuerySchema = z.object({
  professional_id: z.coerce.number().int().positive(),
  offset: z.coerce.number().int().min(0).catch(0),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).catch(MAX_LIMIT),
});

export async function GET(request: NextRequest) {
  if (!(await isAllowed("advisor_reviews_public", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    professional_id: url.searchParams.get("professional_id"),
    offset: url.searchParams.get("offset"),
    limit: url.searchParams.get("limit"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing professional_id" }, { status: 400 });
  }

  const { professional_id: professionalId, offset, limit } = parsed.data;

  // professional_reviews exposes approved rows to anon via RLS, so the
  // user-cookie server client is correct here (never the service-role admin).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_reviews")
    .select("*, advisor_response:professional_review_responses(id, body, created_at, updated_at)")
    .eq("professional_id", professionalId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log.error("Failed to load public advisor reviews", {
      professionalId,
      error: error.message,
    });
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [] });
}

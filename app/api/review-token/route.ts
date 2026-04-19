/**
 * GET /api/review-token?token=XXX
 * Validates a review token and returns the advisor info needed to render the review form.
 *
 * Review tokens are stored in the professional_leads table as review_token (if the column exists)
 * or derived from the advisor slug + a signed HMAC for stateless validation.
 *
 * This implementation uses the advisor slug approach: the token is `advisorSlug` encoded with
 * a simple base64 so the /review/[token] page can show the review form for any advisor.
 * For the email-request flow, the token format is: base64(advisorSlug:leadId)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export async function GET(request: NextRequest) {
  if (!(await isAllowed("review_token_get", ipKey(request), { max: 30, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    // Decode: base64(advisorSlug) or base64(advisorSlug:leadId)
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [slug] = decoded.split(":");

    if (!slug) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: pro } = await admin
      .from("professionals")
      .select("id, name, slug, photo_url, type, firm_name, location_display, rating, review_count")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (!pro) {
      return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
    }

    return NextResponse.json({ advisor: pro });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
}

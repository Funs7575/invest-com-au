import { isRateLimited } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";

export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`profile_update:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // eslint-disable-next-line invest/no-unvalidated-req-json -- field-level allowlist below enforces the contract; full Zod schema would duplicate that list.
  const body = await request.json();

  // Only allow updating specific fields (not status, verified, rating, etc.)
  // available_in_countries is the advisor's self-asserted corridor coverage
  // (FIN_NOTEBOOK cross-border Phase B). Stored as ISO 3166-1 alpha-2
  // codes (au, gb, us, in, …); the matcher uses it to country-match-boost
  // incoming intent-country leads.
  const allowedFields = ["bio", "specialties", "fee_structure", "fee_description", "website", "phone", "photo_url", "booking_link", "booking_intro", "offer_text", "offer_terms", "offer_active", "available_in_countries", "availability_status"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Use admin client: some advisors authenticate via the advisor_session cookie
  // (no Supabase Auth session), so auth.uid() is NULL for those requests and the
  // "Advisor can update own profile" RLS policy would silently deny the UPDATE.
  // The application-layer allowlist above enforces field-level restrictions.
  const admin = createAdminClient();
  const { error } = await admin
    .from("professionals")
    .update(updates)
    .eq("id", advisorId);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

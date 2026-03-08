import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAdvisorId(request: NextRequest): Promise<number | null> {
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.professional_id;
}

export async function PATCH(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const supabase = await createClient();

  // Only allow updating specific fields (not status, verified, rating, etc.)
  const allowedFields = ["bio", "specialties", "fee_structure", "fee_description", "website", "phone", "photo_url", "booking_link", "booking_intro"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { error } = await supabase
    .from("professionals")
    .update(updates)
    .eq("id", advisorId);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

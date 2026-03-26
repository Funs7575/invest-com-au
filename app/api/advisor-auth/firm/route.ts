import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdvisorFromSession(request: NextRequest) {
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: advisor } = await supabase
    .from("professionals")
    .select("id, name, firm_id, is_firm_admin, role")
    .eq("id", session.professional_id)
    .single();

  return advisor;
}

// GET — fetch firm details (any firm member can view)
export async function GET(request: NextRequest) {
  const advisor = await getAdvisorFromSession(request);
  if (!advisor?.firm_id) return NextResponse.json({ error: "Not authenticated or not in a firm" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: firm, error } = await supabase
    .from("advisor_firms")
    .select("*")
    .eq("id", advisor.firm_id)
    .single();

  if (error || !firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

  // Get member count for seat info
  const { count: memberCount } = await supabase
    .from("professionals")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", advisor.firm_id);

  return NextResponse.json({ firm, memberCount: memberCount || 0 });
}

// PATCH — update firm details (firm admins only)
export async function PATCH(request: NextRequest) {
  const advisor = await getAdvisorFromSession(request);
  if (!advisor?.is_firm_admin || !advisor.firm_id) {
    return NextResponse.json({ error: "Only firm admins can update firm details" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Allowlist editable fields
  const allowed = ["name", "bio", "website", "phone", "email", "location_state", "location_suburb", "abn", "acn", "afsl_number", "logo_url"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = typeof body[key] === "string" ? (body[key] as string).trim() || null : body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Recompute location_display if location fields changed
  if ("location_suburb" in updates || "location_state" in updates) {
    const supabase = createAdminClient();
    const { data: current } = await supabase.from("advisor_firms").select("location_suburb, location_state").eq("id", advisor.firm_id).single();
    const suburb = ("location_suburb" in updates ? updates.location_suburb : current?.location_suburb) as string | null;
    const state = ("location_state" in updates ? updates.location_state : current?.location_state) as string | null;
    updates.location_display = [suburb, state].filter(Boolean).join(", ") || null;
  }

  const supabase = createAdminClient();
  const { data: firm, error } = await supabase
    .from("advisor_firms")
    .update(updates)
    .eq("id", advisor.firm_id)
    .select()
    .single();

  if (error) {
    console.error("[firm] update failed:", error);
    return NextResponse.json({ error: "Failed to update firm" }, { status: 500 });
  }

  return NextResponse.json({ firm });
}

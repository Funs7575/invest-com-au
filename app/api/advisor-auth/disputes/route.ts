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

// Create a dispute
export async function POST(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { leadId, reason, details } = await request.json();
  if (!leadId || !reason) return NextResponse.json({ error: "Lead ID and reason required" }, { status: 400 });

  const supabase = await createClient();

  // Verify lead belongs to this advisor
  const { data: lead } = await supabase
    .from("professional_leads")
    .select("id, professional_id")
    .eq("id", leadId)
    .eq("professional_id", advisorId)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Check no existing dispute
  const { data: existingDispute } = await supabase
    .from("lead_disputes")
    .select("id")
    .eq("lead_id", leadId)
    .single();

  if (existingDispute) return NextResponse.json({ error: "This lead already has a dispute" }, { status: 409 });

  // Find associated billing record
  const { data: billingRecord } = await supabase
    .from("advisor_billing")
    .select("id")
    .eq("lead_id", leadId)
    .single();

  const { error } = await supabase.from("lead_disputes").insert({
    lead_id: leadId,
    professional_id: advisorId,
    reason,
    details: details || null,
    billing_id: billingRecord?.id || null,
  });

  if (error) return NextResponse.json({ error: "Failed to create dispute" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Get disputes for authenticated advisor
export async function GET(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = await createClient();
  const { data: disputes } = await supabase
    .from("lead_disputes")
    .select("*, professional_leads(user_name, user_email, created_at)")
    .eq("professional_id", advisorId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ disputes: disputes || [] });
}

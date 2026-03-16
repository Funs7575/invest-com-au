import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/admin";

async function getAdvisorId(request: NextRequest): Promise<number | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  
  // Try Supabase Auth first
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .eq("auth_user_id", user.id)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (advisor) return advisor.id;
  }
  
  // Fallback: legacy cookie session
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;
  const { data } = await admin
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
    .select("id, professional_id, created_at, billed")
    .eq("id", leadId)
    .eq("professional_id", advisorId)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Enforce 14-day dispute window
  const leadAge = Date.now() - new Date(lead.created_at).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (leadAge > fourteenDays) {
    return NextResponse.json({
      error: "Dispute window has closed. Leads can only be disputed within 14 days of delivery."
    }, { status: 400 });
  }

  // Only allow disputes on billed leads
  if (!lead.billed) {
    return NextResponse.json({
      error: "This lead was not billed (free trial lead) and cannot be disputed."
    }, { status: 400 });
  }

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

  // Notify admin of new dispute
  if (process.env.RESEND_API_KEY) {
    const { data: advisor } = await supabase.from("professionals").select("name").eq("id", advisorId).single();
    const { data: leadData } = await supabase.from("professional_leads").select("user_name, user_email").eq("id", leadId).single();
    const advisorName = advisor?.name || "An advisor";
    const leadName = leadData?.user_name || "Unknown";
    const { getSiteUrl } = await import("@/lib/url"); const siteUrl = getSiteUrl();

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Invest.com.au <system@invest.com.au>",
        to: ADMIN_EMAIL,
        subject: `Lead Dispute: ${advisorName} disputed lead from ${leadName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">⚠️ New Lead Dispute</h2><p style="color:#64748b;font-size:14px"><strong>${advisorName}</strong> has disputed a lead.</p><table style="width:100%;font-size:13px;margin:12px 0"><tr><td style="padding:4px 0;color:#64748b">Lead</td><td style="padding:4px 0;font-weight:600">${leadName} (${leadData?.user_email || "no email"})</td></tr><tr><td style="padding:4px 0;color:#64748b">Reason</td><td style="padding:4px 0;font-weight:600">${reason}</td></tr>${details ? `<tr><td style="padding:4px 0;color:#64748b;vertical-align:top">Details</td><td style="padding:4px 0">${details}</td></tr>` : ""}</table><a href="${siteUrl}/admin/advisors" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">Review Dispute →</a></div>`,
      }),
    }).catch((err) => console.error("[disputes] notification email failed:", err));
  }

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

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReviewRequest } from "@/lib/advisor-emails";
import { requireAdvisorSession } from "@/lib/require-advisor-session";

export async function POST(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const leadId = body?.leadId;
  if (!leadId || typeof leadId !== "number") {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the lead — must belong to this advisor and be converted
  const { data: lead } = await admin
    .from("professional_leads")
    .select("id, user_name, user_email, status, review_requested_at")
    .eq("id", leadId)
    .eq("professional_id", advisorId)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "converted") {
    return NextResponse.json({ error: "Review requests can only be sent for converted leads" }, { status: 400 });
  }
  if (lead.review_requested_at) {
    return NextResponse.json({ error: "Review request already sent" }, { status: 409 });
  }

  // Fetch the advisor's name and slug
  const { data: advisor } = await admin
    .from("professionals")
    .select("name, slug")
    .eq("id", advisorId)
    .single();

  if (!advisor) return NextResponse.json({ error: "Advisor not found" }, { status: 500 });

  const ok = await sendReviewRequest(
    lead.user_email,
    lead.user_name,
    advisor.name,
    advisor.slug,
  );

  if (!ok) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Mark as sent
  await admin
    .from("professional_leads")
    .update({ review_requested_at: new Date().toISOString() })
    .eq("id", leadId);

  return NextResponse.json({ success: true });
}

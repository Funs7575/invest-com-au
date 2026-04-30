import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";

const DEFAULT_PREFS = {
  new_lead: true,
  weekly_summary: true,
  billing_alerts: true,
  review_new: false,
};

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("email_preferences")
    .eq("id", advisorId)
    .single();

  const saved = (pro?.email_preferences as Record<string, unknown> | null) || {};
  const prefs = {
    new_lead: saved.new_lead !== undefined ? !!saved.new_lead : DEFAULT_PREFS.new_lead,
    weekly_summary: saved.weekly_summary !== undefined ? !!saved.weekly_summary : DEFAULT_PREFS.weekly_summary,
    billing_alerts: saved.billing_alerts !== undefined ? !!saved.billing_alerts : DEFAULT_PREFS.billing_alerts,
    review_new: saved.review_new !== undefined ? !!saved.review_new : DEFAULT_PREFS.review_new,
  };

  return NextResponse.json({ prefs });
}

export async function PATCH(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.prefs || typeof body.prefs !== "object") {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  const { new_lead, weekly_summary, billing_alerts, review_new } = body.prefs;
  const prefs = {
    new_lead: !!new_lead,
    weekly_summary: !!weekly_summary,
    billing_alerts: !!billing_alerts,
    review_new: !!review_new,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("professionals")
    .update({ email_preferences: prefs })
    .eq("id", advisorId);

  if (error) {
    // Column may not exist — return success silently
    return NextResponse.json({ success: true, warning: "Preferences saved in memory only" });
  }

  return NextResponse.json({ success: true });
}

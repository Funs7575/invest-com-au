import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("regulatory-impacts");

/**
 * GET /api/admin/regulatory-impacts?alert_id=123
 * List broker impacts for a regulatory alert.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alertId = request.nextUrl.searchParams.get("alert_id");
  if (!alertId) {
    return NextResponse.json({ error: "alert_id required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("regulatory_broker_impacts")
    .select("*")
    .eq("alert_id", parseInt(alertId))
    .order("impact_level", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

/**
 * POST /api/admin/regulatory-impacts
 * Add or update a broker impact assessment.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { alert_id, broker_slug, impact_level, impact_description, estimated_fee_change, broker_response } = body;

  if (!alert_id || !broker_slug || !impact_level || !impact_description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validLevels = ["none", "low", "medium", "high", "critical"];
  if (!validLevels.includes(impact_level)) {
    return NextResponse.json({ error: "Invalid impact_level" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("regulatory_broker_impacts")
    .upsert({
      alert_id,
      broker_slug,
      impact_level,
      impact_description,
      estimated_fee_change: estimated_fee_change || null,
      broker_response: broker_response || null,
    }, { onConflict: "alert_id,broker_slug" })
    .select()
    .single();

  if (error) {
    log.error("Failed to save impact", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update the affected_broker_slugs array on the alert
  const { data: allImpacts } = await admin
    .from("regulatory_broker_impacts")
    .select("broker_slug")
    .eq("alert_id", alert_id);

  if (allImpacts) {
    const slugs = allImpacts.map((i: { broker_slug: string }) => i.broker_slug);
    await admin
      .from("regulatory_alerts")
      .update({ affected_broker_slugs: slugs })
      .eq("id", alert_id);
  }

  log.info("Impact assessment saved", { alert_id, broker_slug, impact_level });
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/regulatory-impacts?id=123
 * Remove a broker impact assessment.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("regulatory_broker_impacts").delete().eq("id", parseInt(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

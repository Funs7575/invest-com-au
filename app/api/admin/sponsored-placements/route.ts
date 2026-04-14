import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/require-admin";
import { recordFinancialAudit } from "@/lib/financial-audit";

const log = logger("admin:sponsored-placements");

/**
 * GET  — list all placements (active + expired).
 * POST — create a placement. Body:
 *    { professional_id, tier, vertical?, daily_cap_cents, ends_at? }
 * PATCH — toggle active. Body: { id, active }
 *
 * Side effects on create:
 *   - Flips professionals.is_sponsored = true and stamps
 *     sponsored_boost based on tier
 *   - Logs a financial audit entry so compliance can see who authorised
 *     a paid placement
 */

const TIER_BOOST: Record<string, number> = {
  boost: 8,
  premium: 14,
  top: 20,
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sponsored_placements")
    .select(
      "id, professional_id, vertical, tier, daily_cap_cents, spend_today_cents, starts_at, ends_at, active, created_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    log.error("sponsored_placements fetch failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data || [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const professionalId =
    typeof body.professional_id === "number" ? body.professional_id : null;
  const tier = typeof body.tier === "string" ? body.tier : null;
  const vertical = typeof body.vertical === "string" ? body.vertical : null;
  const dailyCapCents =
    typeof body.daily_cap_cents === "number" ? body.daily_cap_cents : 0;
  const endsAt = typeof body.ends_at === "string" ? body.ends_at : null;

  if (!professionalId || !tier || !(tier in TIER_BOOST)) {
    return NextResponse.json(
      { error: "Missing professional_id or invalid tier (boost|premium|top)" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const boost = TIER_BOOST[tier];

  const { data: inserted, error } = await admin
    .from("sponsored_placements")
    .insert({
      professional_id: professionalId,
      tier,
      vertical,
      daily_cap_cents: dailyCapCents,
      ends_at: endsAt,
      active: true,
      created_by: guard.email,
    })
    .select("id")
    .single();

  if (error) {
    log.error("sponsored_placements insert failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("professionals")
    .update({ is_sponsored: true, sponsored_boost: boost })
    .eq("id", professionalId);

  await recordFinancialAudit({
    actorType: "admin",
    actorId: guard.email,
    action: "adjustment",
    resourceType: "sponsored_placement",
    resourceId: String(inserted.id),
    amountCents: dailyCapCents,
    reason: `Activated ${tier} placement for advisor #${professionalId}`,
    context: { vertical, ends_at: endsAt },
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "number" ? body.id : null;
  const active = typeof body.active === "boolean" ? body.active : null;
  if (!id || active === null) {
    return NextResponse.json({ error: "Missing id or active" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("sponsored_placements")
    .select("professional_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin
    .from("sponsored_placements")
    .update({ active, ends_at: active ? null : new Date().toISOString() })
    .eq("id", id);

  // Recompute professionals.is_sponsored — any other active row for
  // the same advisor keeps the flag on
  const { data: still } = await admin
    .from("sponsored_placements")
    .select("id, tier")
    .eq("professional_id", row.professional_id as number)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  await admin
    .from("professionals")
    .update({
      is_sponsored: !!still,
      sponsored_boost: still ? TIER_BOOST[(still.tier as string) || "boost"] : null,
    })
    .eq("id", row.professional_id as number);

  await recordFinancialAudit({
    actorType: "admin",
    actorId: guard.email,
    action: "adjustment",
    resourceType: "sponsored_placement",
    resourceId: String(id),
    reason: active ? "Re-activated placement" : "Deactivated placement",
  });

  return NextResponse.json({ ok: true });
}

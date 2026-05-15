import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("consultations:availability");

/**
 * DELETE /api/pros/availability/[id] — Pro removes their own open slot.
 *
 * Booked slots can't be deleted via this route — the pro must cancel
 * the booking first (which frees the slot) and then delete it.
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("pros_availability_delete", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { id } = await ctx.params;
    const slotId = Number(id);
    if (!Number.isInteger(slotId) || slotId <= 0) {
      return NextResponse.json({ error: "Invalid slot id." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: slot } = await admin
      .from("pro_availability_slots")
      .select("id, professional_id, status")
      .eq("id", slotId)
      .maybeSingle();
    if (!slot) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }
    if (slot.professional_id !== advisorId) {
      return NextResponse.json({ error: "Not your slot." }, { status: 403 });
    }
    if (slot.status === "booked") {
      return NextResponse.json(
        { error: "Slot has been booked — cancel the booking first." },
        { status: 409 },
      );
    }

    const { error } = await admin
      .from("pro_availability_slots")
      .delete()
      .eq("id", slotId);
    if (error) {
      log.warn("delete slot failed", { slotId, err: error.message });
      return NextResponse.json(
        { error: "Could not delete slot." },
        { status: 500 },
      );
    }

    log.info("availability slot deleted", {
      slotId,
      professionalId: advisorId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("availability delete error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to delete slot." },
      { status: 500 },
    );
  }
}

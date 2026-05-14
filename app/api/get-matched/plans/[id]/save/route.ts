import { NextRequest, NextResponse } from "next/server";

import { SavePlanRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import { logEvent } from "@/lib/getmatched/events";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:save");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("gm_plan_save", ipKey(request), { max: 10, refillPerSec: 0.1 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { id } = await ctx.params;
    const planId = Number(id);
    if (!Number.isFinite(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = SavePlanRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const plan = await getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    const updated = await updatePlan({
      id: planId,
      email: parsed.data.email.toLowerCase().trim(),
      status: plan.status === "converted" ? plan.status : "saved",
    });
    void logEvent({
      sessionId: plan.session_id,
      authUserId: plan.auth_user_id,
      eventType: "plan_saved",
      payload: { plan_id: planId },
    });
    return NextResponse.json({
      success: true,
      share_token: updated.share_token,
      view_url: `/plans/${updated.share_token}`,
    });
  } catch (err) {
    log.error("save error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to save plan." }, { status: 500 });
  }
}

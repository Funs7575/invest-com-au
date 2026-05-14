import { NextRequest, NextResponse } from "next/server";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createClient } from "@/lib/supabase/server";
import { claimPlanForUser } from "@/lib/getmatched/action-plans";
import { logEvent } from "@/lib/getmatched/events";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:claim");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("gm_plan_claim", ipKey(request), { max: 10, refillPerSec: 0.1 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { id } = await ctx.params;
    const planId = Number(id);
    if (!Number.isFinite(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }
    const plan = await claimPlanForUser({
      planId,
      authUserId: user.id,
      email: user.email ?? undefined,
    });
    void logEvent({
      sessionId: plan.session_id,
      authUserId: user.id,
      eventType: "account_created",
      payload: { plan_id: planId },
    });
    return NextResponse.json({ success: true, plan });
  } catch (err) {
    log.error("claim error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to claim plan." }, { status: 500 });
  }
}

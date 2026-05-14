import { NextRequest, NextResponse } from "next/server";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanByToken } from "@/lib/getmatched/action-plans";
import { getResultTemplate } from "@/lib/getmatched/templates";
import { logger } from "@/lib/logger";
import type { IntentSlug, RouteType } from "@/lib/getmatched/types";

const log = logger("get-matched:plan:token");

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (
      !(await isAllowed("gm_plan_token", ipKey(request), { max: 30, refillPerSec: 0.5 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { token } = await ctx.params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    const plan = await getPlanByToken(token);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    const template = plan.route
      ? await getResultTemplate(plan.route as RouteType, plan.intent_slug as IntentSlug | null)
      : null;
    return NextResponse.json({ plan, template });
  } catch (err) {
    log.error("token plan error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load plan." }, { status: 500 });
  }
}

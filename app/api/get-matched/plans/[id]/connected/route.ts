/**
 * POST /api/get-matched/plans/[id]/connected — mark a plan converted after an
 * in-funnel advisor connection (Decision Engine P6). Best-effort bookkeeping:
 * the lead row (created by /api/submit-lead) is the source of truth; this
 * stamps the plan so the workspace + P9 outcome learning can join on it.
 * Share-token authenticated, same model as save-item (no id oracle).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:connected");

const Body = z.object({
  share_token: z.string().min(8).max(120),
  lead_id: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAllowed("gm_plan_connected", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { id } = await ctx.params;
    const planId = Number(id);
    if (!Number.isFinite(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const plan = await getPlanById(planId);
    if (!plan || plan.share_token !== parsed.data.share_token) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    const updated = await updatePlan({
      id: planId,
      status: "converted",
      meta: { ...(plan.meta ?? {}), connected_lead_id: parsed.data.lead_id, connected_at: new Date().toISOString() },
    });
    return NextResponse.json({ status: updated.status });
  } catch (err) {
    log.error("connected error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update plan." }, { status: 500 });
  }
}

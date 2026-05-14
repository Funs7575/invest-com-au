import { NextRequest, NextResponse } from "next/server";

import { ChecklistToggleRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  getPlanById,
  toggleChecklistItem,
  updatePlan,
} from "@/lib/getmatched/action-plans";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:checklist");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("gm_checklist", ipKey(request), { max: 60, refillPerSec: 1 }))
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
    const parsed = ChecklistToggleRequest.safeParse(rawBody);
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
    const next = toggleChecklistItem(plan.checklist, parsed.data.index);
    const updated = await updatePlan({ id: planId, checklist: next });
    return NextResponse.json({ checklist: updated.checklist });
  } catch (err) {
    log.error("checklist error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to update checklist." },
      { status: 500 },
    );
  }
}

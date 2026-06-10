/**
 * POST /api/get-matched/plans/[id]/save-item — add/remove a shortlisted
 * option on a plan's "My Options" workspace (Decision Engine P5).
 *
 * Auth model: anonymous-friendly but NOT guessable — the caller must present
 * the plan's share_token (issued to the session that created the plan).
 * Stricter than the checklist route: this stores user choices, so a bare
 * numeric id is not enough. Saving is never contacting (single-lead holds).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import type { SavedItem } from "@/lib/getmatched/types";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:save-item");

const MAX_SAVED_ITEMS = 50;

const Body = z.object({
  share_token: z.string().min(8).max(120),
  action: z.enum(["add", "remove"]),
  item: z.object({
    kind: z.enum(["advisor", "listing", "platform"]),
    ref: z.string().min(1).max(120),
    label: z.string().max(160).optional(),
  }),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAllowed("gm_save_item", ipKey(request), { max: 60, refillPerSec: 1 }))) {
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
    const { share_token, action, item } = parsed.data;

    const plan = await getPlanById(planId);
    if (!plan || plan.share_token !== share_token) {
      // One response for both cases — don't leak which ids exist.
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const current: SavedItem[] = Array.isArray(plan.saved_items) ? plan.saved_items : [];
    let next: SavedItem[];
    if (action === "add") {
      const without = current.filter((s) => !(s.kind === item.kind && s.ref === item.ref));
      next = [
        ...without,
        { kind: item.kind, ref: item.ref, label: item.label, saved_at: new Date().toISOString() },
      ].slice(-MAX_SAVED_ITEMS);
    } else {
      next = current.filter((s) => !(s.kind === item.kind && s.ref === item.ref));
    }

    const updated = await updatePlan({ id: planId, saved_items: next });
    return NextResponse.json({ saved_items: updated.saved_items ?? next });
  } catch (err) {
    log.error("save-item error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to save option." }, { status: 500 });
  }
}

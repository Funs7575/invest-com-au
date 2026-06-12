import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { isBriefTemplate } from "@/lib/briefs/templates";
import { QUOTE_AU_STATES, QUOTE_BUDGET_BANDS } from "@/lib/api-schemas";

const log = logger("advisor-auth:standing-orders:id");

const PatchBody = z
  .object({
    status: z.enum(["active", "paused"]).optional(),
    // Pause-until is only meaningful with status='paused'; null clears it.
    paused_until: z.string().datetime({ offset: true }).nullable().optional(),
    brief_templates: z
      .array(z.string().max(60))
      .max(10)
      .optional()
      .refine((arr) => !arr || arr.every((t) => isBriefTemplate(t)), {
        message: "Unknown brief template.",
      }),
    states: z.array(z.enum(QUOTE_AU_STATES)).max(8).optional(),
    budget_bands: z.array(z.enum(QUOTE_BUDGET_BANDS)).max(6).optional(),
    max_credits_per_accept: z.number().int().min(1).max(100).optional(),
    weekly_accept_cap: z.number().int().min(1).max(25).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to update." });

async function resolveOwnedOrder(
  request: NextRequest,
  idParam: string,
): Promise<
  | { ok: true; advisorId: number; orderId: number }
  | { ok: false; response: NextResponse }
> {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }
  const orderId = Number(idParam);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid id." }, { status: 400 }),
    };
  }
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("advisor_standing_orders")
    .select("id, professional_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.professional_id !== advisorId) {
    // 404 for both missing and not-owned — don't leak other advisers' ids.
    return {
      ok: false,
      response: NextResponse.json({ error: "Standing order not found." }, { status: 404 }),
    };
  }
  return { ok: true, advisorId, orderId };
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAllowed("standing_orders_write", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const owned = await resolveOwnedOrder(request, id);
  if (!owned.ok) return owned.response;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const b = parsed.data;
  if (b.status !== undefined) updates.status = b.status;
  if (b.paused_until !== undefined) updates.paused_until = b.paused_until;
  if (b.brief_templates !== undefined) updates.brief_templates = b.brief_templates;
  if (b.states !== undefined) updates.states = b.states;
  if (b.budget_bands !== undefined) updates.budget_bands = b.budget_bands;
  if (b.max_credits_per_accept !== undefined)
    updates.max_credits_per_accept = b.max_credits_per_accept;
  if (b.weekly_accept_cap !== undefined) updates.weekly_accept_cap = b.weekly_accept_cap;

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("advisor_standing_orders")
    .update(updates)
    .eq("id", owned.orderId)
    .select("*")
    .single();

  if (error || !order) {
    log.error("standing order update failed", { orderId: owned.orderId, err: error?.message });
    return NextResponse.json({ error: "Failed to update standing order." }, { status: 500 });
  }
  return NextResponse.json({ success: true, order });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAllowed("standing_orders_write", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { id } = await ctx.params;
  const owned = await resolveOwnedOrder(request, id);
  if (!owned.ok) return owned.response;

  const admin = createAdminClient();
  const { error } = await admin
    .from("advisor_standing_orders")
    .delete()
    .eq("id", owned.orderId);
  if (error) {
    log.error("standing order delete failed", { orderId: owned.orderId, err: error.message });
    return NextResponse.json({ error: "Failed to delete standing order." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

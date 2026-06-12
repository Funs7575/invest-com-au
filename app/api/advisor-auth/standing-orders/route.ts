import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import { isBriefTemplate } from "@/lib/briefs/templates";
import { QUOTE_AU_STATES, QUOTE_BUDGET_BANDS } from "@/lib/api-schemas";
import {
  MAX_ORDERS_PER_ADVISOR,
  STANDING_ORDERS_FLAG,
  type StandingOrderRow,
} from "@/lib/briefs/standing-orders";

const log = logger("advisor-auth:standing-orders");

const CreateBody = z.object({
  brief_templates: z
    .array(z.string().max(60))
    .max(10)
    .default([])
    .refine((arr) => arr.every((t) => isBriefTemplate(t)), {
      message: "Unknown brief template.",
    }),
  states: z.array(z.enum(QUOTE_AU_STATES)).max(8).default([]),
  budget_bands: z.array(z.enum(QUOTE_BUDGET_BANDS)).max(6).default([]),
  max_credits_per_accept: z.number().int().min(1).max(100).default(10),
  weekly_accept_cap: z.number().int().min(1).max(25).default(3),
});

/**
 * GET /api/advisor-auth/standing-orders — the calling adviser's standing
 * orders, their recent auto-accept activity, and whether platform-wide
 * execution is currently enabled (the `standing_orders` feature flag).
 */
export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: orders }, { data: runs }, executionEnabled] = await Promise.all([
    admin
      .from("advisor_standing_orders")
      .select("*")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: true }),
    admin
      .from("advisor_standing_order_runs")
      .select("id, standing_order_id, brief_id, accepted, reason, credits_spent, created_at")
      .eq("professional_id", advisorId)
      .order("created_at", { ascending: false })
      .limit(25),
    isFlagEnabled(STANDING_ORDERS_FLAG, { segment: "advisor" }),
  ]);

  // Rolling 7-day accepted count per order so the UI can show cap usage.
  const since7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyUsed = new Map<number, number>();
  for (const r of runs ?? []) {
    if (!r.accepted || r.standing_order_id === null) continue;
    if (new Date(r.created_at as string).getTime() < since7d) continue;
    const oid = r.standing_order_id as number;
    weeklyUsed.set(oid, (weeklyUsed.get(oid) ?? 0) + 1);
  }

  return NextResponse.json({
    orders: (orders ?? []).map((o) => ({
      ...o,
      weekly_used: weeklyUsed.get(o.id as number) ?? 0,
    })),
    runs: runs ?? [],
    execution_enabled: executionEnabled,
    max_orders: MAX_ORDERS_PER_ADVISOR,
  });
}

/** POST /api/advisor-auth/standing-orders — create a standing order. */
export async function POST(request: NextRequest) {
  if (!(await isAllowed("standing_orders_write", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("advisor_standing_orders")
    .select("id", { count: "exact", head: true })
    .eq("professional_id", advisorId);
  if ((count ?? 0) >= MAX_ORDERS_PER_ADVISOR) {
    return NextResponse.json(
      { error: `You can keep up to ${MAX_ORDERS_PER_ADVISOR} standing orders. Delete one first.` },
      { status: 400 },
    );
  }

  const { data: order, error } = await admin
    .from("advisor_standing_orders")
    .insert({
      professional_id: advisorId,
      brief_templates: parsed.data.brief_templates,
      states: parsed.data.states,
      budget_bands: parsed.data.budget_bands,
      max_credits_per_accept: parsed.data.max_credits_per_accept,
      weekly_accept_cap: parsed.data.weekly_accept_cap,
    })
    .select("*")
    .single();

  if (error || !order) {
    log.error("standing order insert failed", { advisorId, err: error?.message });
    return NextResponse.json({ error: "Failed to save standing order." }, { status: 500 });
  }

  log.info("standing order created", { advisorId, orderId: order.id });
  return NextResponse.json({ success: true, order: order as unknown as StandingOrderRow });
}

/**
 * /api/account/goals — investor_goals CRUD (W2 Phase 9).
 *
 * GET    — current user's goals (ordered by target_date ASC)
 * POST   — add a goal
 * PATCH  — update a goal (id required)
 * DELETE — remove a goal (id required)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { awardIfEligible } from "@/lib/quests-server";
import { logger } from "@/lib/logger";

const log = logger("api:account:goals");

export const runtime = "nodejs";

const GOAL_TYPES = ["house_deposit", "retirement", "education", "generic", "fire", "debt_free"] as const;

const AddBody = z.object({
  label: z.string().min(1).max(120),
  goal_type: z.enum(GOAL_TYPES),
  target_cents: z.coerce.number().int().min(0),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  current_balance_cents: z.coerce.number().int().min(0).default(0),
  monthly_contribution_cents: z.coerce.number().int().min(0).default(0),
  expected_return_pct: z.coerce.number().min(-10).max(30).default(6.5),
  notes: z.string().max(500).nullish(),
});

const UpdateBody = AddBody.partial().extend({
  id: z.coerce.number().int().positive(),
});

const RemoveBody = z.object({
  id: z.coerce.number().int().positive(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("investor_goals")
    .select("*")
    .order("target_date", { ascending: true });
  if (error) {
    log.warn("goals GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("investor_goals")
    .insert({ auth_user_id: user.id, ...body })
    .select("*")
    .single();
  if (error) {
    log.warn("goals POST failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  // Quest: first-goal. Fire-and-forget — flag-gated + fail-soft inside.
  void awardIfEligible(user.id, "first-goal");
  return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, ...rest } = body;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) update[k] = v;
  }
  const { data, error } = await supabase
    .from("investor_goals")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    log.warn("goals PATCH failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
});

export const DELETE = withValidatedBody(RemoveBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("investor_goals")
    .delete()
    .eq("id", body.id);
  if (error) {
    log.warn("goals DELETE failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

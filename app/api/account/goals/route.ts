import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:goals");

export const runtime = "nodejs";

/**
 * /api/account/goals — investor goal-tracker CRUD (PR-X5h).
 *
 *   GET    — authenticated user's goals (RLS scopes to own rows)
 *   POST   — add a goal
 *   PATCH  — update a goal (id required)
 *   DELETE — remove a goal (id required)
 *
 * RLS scopes per-user reads/writes; the handler uses the user-scoped
 * supabase client so policies fire, never service-role.
 *
 * Column convention follows the existing dashboard-provisioned table
 * (see migration 20260511000000_investor_goals.sql): label, goal_type,
 * target_cents, target_date, current_balance_cents,
 * monthly_contribution_cents, expected_return_pct, notes.
 */

const GOAL_TYPES = ["retirement", "home", "education", "travel", "general"] as const;

const AddGoalBody = z.object({
  label: z.string().min(1).max(120),
  goal_type: z.enum(GOAL_TYPES).default("general"),
  target_cents: z.coerce.number().int().positive().max(1_000_000_000_000),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD required"),
  current_balance_cents: z.coerce.number().int().min(0).max(1_000_000_000_000).default(0),
  monthly_contribution_cents: z.coerce.number().int().min(0).max(100_000_000).default(0),
  expected_return_pct: z.coerce.number().min(-20).max(30).default(6),
  notes: z.string().max(500).nullish(),
});

const UpdateGoalBody = AddGoalBody.partial().extend({
  id: z.coerce.number().int().positive(),
});

const RemoveGoalBody = z.object({
  id: z.coerce.number().int().positive(),
});

const SELECT_COLS =
  "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct, notes, created_at, updated_at";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("investor_goals")
    .select(SELECT_COLS)
    .order("target_date", { ascending: true });

  if (error) {
    log.warn("goals fetch failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddGoalBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("investor_goals")
    .insert({
      auth_user_id: user.id,
      label: body.label.trim(),
      goal_type: body.goal_type,
      target_cents: body.target_cents,
      target_date: body.target_date,
      current_balance_cents: body.current_balance_cents,
      monthly_contribution_cents: body.monthly_contribution_cents,
      expected_return_pct: body.expected_return_pct,
      notes: body.notes ?? null,
    })
    .select(SELECT_COLS)
    .single();

  if (error) {
    log.warn("goals insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateGoalBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, ...rest } = body;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.label !== undefined) update.label = rest.label.trim();
  if (rest.goal_type !== undefined) update.goal_type = rest.goal_type;
  if (rest.target_cents !== undefined) update.target_cents = rest.target_cents;
  if (rest.target_date !== undefined) update.target_date = rest.target_date;
  if (rest.current_balance_cents !== undefined) update.current_balance_cents = rest.current_balance_cents;
  if (rest.monthly_contribution_cents !== undefined) update.monthly_contribution_cents = rest.monthly_contribution_cents;
  if (rest.expected_return_pct !== undefined) update.expected_return_pct = rest.expected_return_pct;
  if (rest.notes !== undefined) update.notes = rest.notes;

  const { data, error } = await supabase
    .from("investor_goals")
    .update(update)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error) {
    log.warn("goals update failed", { error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
});

export const DELETE = withValidatedBody(RemoveGoalBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("investor_goals")
    .delete()
    .eq("id", body.id);

  if (error) {
    log.warn("goals delete failed", { error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

/**
 * /api/account/scenarios — named calculator scenarios CRUD (Scenario Workspace).
 *
 *   GET    — list the current user's scenarios (newest first).
 *   POST   — create a scenario (capped at MAX_SCENARIOS_PER_USER).
 *   PATCH  — rename a scenario (id + name).
 *   DELETE — remove a scenario (id).
 *
 * Auth + ownership: `createClient()` (RLS server client) + `getUser()`; row
 * ownership is enforced by the `user_scenarios` RLS owner policies, so writes
 * only ever touch the caller's own rows. NO admin client (pure user feature).
 *
 * Gating: the whole feature is behind the `scenario_workspace` flag and fails
 * closed — flag off ⇒ 404 (route behaves as if it doesn't exist) so nothing
 * 500s before the table ships / while the flag is off.
 *
 * Share-token lifecycle lives in ./scenarios/[id]/share/route.ts.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  MAX_SCENARIOS_PER_USER,
  SCENARIO_NAME_MAX,
  SCENARIO_OWNER_COLUMNS,
  SCENARIO_WORKSPACE_FLAG,
} from "@/lib/scenarios";

const log = logger("api:account:scenarios");

export const runtime = "nodejs";

/** Inputs/snapshot are opaque calculator blobs; bound their size, not shape. */
const JsonObject = z.record(z.string(), z.unknown());

const CreateBody = z.object({
  calculator_key: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(SCENARIO_NAME_MAX),
  inputs: JsonObject,
  results_snapshot: JsonObject.nullish(),
});

const RenameBody = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(SCENARIO_NAME_MAX),
});

const RemoveBody = z.object({
  id: z.string().uuid(),
});

/** Shared gate: returns the user when the flag is on + signed in, else a Response. */
async function gate(): Promise<
  | { user: { id: string }; supabase: Awaited<ReturnType<typeof createClient>> }
  | NextResponse
> {
  if (!(await isFlagEnabled(SCENARIO_WORKSPACE_FLAG))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return { user, supabase };
}

export async function GET() {
  const gated = await gate();
  if (gated instanceof NextResponse) return gated;
  const { user, supabase } = gated;

  const { data, error } = await supabase
    .from("user_scenarios")
    .select(SCENARIO_OWNER_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) {
    log.warn("scenarios GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(CreateBody, async (_req, body) => {
  const gated = await gate();
  if (gated instanceof NextResponse) return gated;
  const { user, supabase } = gated;

  // 30 creates/min per user — protects against runaway client loops.
  if (await isRateLimited(`scenario-create:${user.id}`, 30, 1)) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  // Enforce the per-user cap with a count (RLS scopes the count to the caller).
  const { count, error: countError } = await supabase
    .from("user_scenarios")
    .select("id", { count: "exact", head: true });
  if (countError) {
    log.warn("scenarios count failed", {
      userId: user.id,
      error: countError.message,
    });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_SCENARIOS_PER_USER) {
    return NextResponse.json(
      {
        error: `You've reached the limit of ${MAX_SCENARIOS_PER_USER} saved scenarios. Delete one to save another.`,
        code: "scenario_limit_reached",
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("user_scenarios")
    .insert({
      user_id: user.id,
      calculator_key: body.calculator_key,
      name: body.name,
      inputs: body.inputs,
      results_snapshot: body.results_snapshot ?? null,
    })
    .select(SCENARIO_OWNER_COLUMNS)
    .single();

  if (error || !data) {
    log.warn("scenarios POST failed", {
      userId: user.id,
      error: error?.message,
    });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withValidatedBody(RenameBody, async (_req, body) => {
  const gated = await gate();
  if (gated instanceof NextResponse) return gated;
  const { user, supabase } = gated;

  if (await isRateLimited(`scenario-write:${user.id}`, 60, 1)) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("user_scenarios")
    .update({ name: body.name, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select(SCENARIO_OWNER_COLUMNS)
    .maybeSingle();

  if (error) {
    log.warn("scenarios PATCH failed", {
      userId: user.id,
      error: error.message,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) {
    // RLS prevented the update (not the owner) or the row is gone.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ item: data });
});

export const DELETE = withValidatedBody(RemoveBody, async (_req, body) => {
  const gated = await gate();
  if (gated instanceof NextResponse) return gated;
  const { user, supabase } = gated;

  if (await isRateLimited(`scenario-write:${user.id}`, 60, 1)) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const { error } = await supabase
    .from("user_scenarios")
    .delete()
    .eq("id", body.id);

  if (error) {
    log.warn("scenarios DELETE failed", {
      userId: user.id,
      error: error.message,
    });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

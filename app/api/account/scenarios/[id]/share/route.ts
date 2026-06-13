/**
 * /api/account/scenarios/[id]/share — manage a scenario's public share link.
 *
 *   POST   — generate (or return the existing) share_token for the scenario.
 *            Response: { share_token } → caller builds /scenarios/shared/<token>.
 *   DELETE — revoke the share link (clears share_token; the public page 404s).
 *
 * Owner-only via RLS (`createClient()` + `getUser()`, no admin client). Gated by
 * the `scenario_workspace` flag (fails closed → 404). Idempotent generate: if a
 * token already exists it is returned unchanged, so re-clicking "Share" is safe.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  newScenarioShareToken,
  SCENARIO_WORKSPACE_FLAG,
} from "@/lib/scenarios";

const log = logger("api:account:scenarios:share");

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gated = await gate();
  if (gated instanceof NextResponse) return gated;
  const { user, supabase } = gated;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (await isRateLimited(`scenario-share:${user.id}`, 30, 1)) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  // Read the row first (RLS scopes to owner). If it already has a token, reuse.
  const { data: existing, error: readError } = await supabase
    .from("user_scenarios")
    .select("id, share_token")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    log.warn("scenario share read failed", {
      userId: user.id,
      error: readError.message,
    });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existingToken = (existing as { share_token: string | null }).share_token;
  if (existingToken) {
    return NextResponse.json({ share_token: existingToken });
  }

  const token = newScenarioShareToken();
  const { data, error } = await supabase
    .from("user_scenarios")
    .update({ share_token: token, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("share_token")
    .maybeSingle();
  if (error || !data) {
    log.warn("scenario share generate failed", {
      userId: user.id,
      error: error?.message,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({
    share_token: (data as { share_token: string | null }).share_token,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gated = await gate();
  if (gated instanceof NextResponse) return gated;
  const { user, supabase } = gated;

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (await isRateLimited(`scenario-share:${user.id}`, 30, 1)) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("user_scenarios")
    .update({ share_token: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    log.warn("scenario share revoke failed", {
      userId: user.id,
      error: error.message,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

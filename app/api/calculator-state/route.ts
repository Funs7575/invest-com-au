/**
 * /api/calculator-state — read & write the signed-in user's cross-calculator state.
 *
 * Anonymous users skip this route entirely and use sessionStorage only via
 * lib/calculator-state.ts {readSessionState, writeSessionState}. On signup the
 * existing claim flow merges anonymous_saves.calculator_state into the DB row.
 *
 * GET   → { state: CalculatorStateMap }
 * POST  body: { calculator: string, source: string, data: Record<string, unknown> }
 *       → { ok: true } on success
 *
 * Response codes mirror the saved-comparisons pattern:
 *   401 = no session
 *   400 = bad body
 *   429 = rate limited
 *   503 = db unavailable
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import type { CalculatorStateMap } from "@/lib/calculator-state";
import type { Json } from "@/lib/database.types";

const log = logger("calculator-state-api");

const WriteSchema = z.object({
  calculator: z.string().min(1).max(64),
  source: z.string().min(1).max(64),
  data: z.record(z.string(), z.unknown()),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("user_calculator_state")
      .select("state, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      log.warn("calculator-state GET failed", {
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json(
        { error: "Something went wrong on our end. Try again in a moment." },
        { status: 500 },
      );
    }

    const state =
      ((data as { state?: unknown } | null)?.state as CalculatorStateMap) ?? {};
    const updatedAt =
      (data as { updated_at?: string } | null)?.updated_at ?? null;

    return NextResponse.json({ state, updated_at: updatedAt });
  } catch (err) {
    log.error("calculator-state GET threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 },
      );
    }

    // 60/min per user — protects against runaway autosave loops in client code.
    if (await isRateLimited(`calc-state:${user.id}`, 60, 1)) {
      return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
    }

    const json = await request.json().catch(() => null);
    const parsed = WriteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body" },
        { status: 400 },
      );
    }

    // Read-merge-write to keep partial updates from one calculator from
    // clobbering another's data. RLS scopes to auth.uid()=user_id.
    const { data: existing } = await supabase
      .from("user_calculator_state")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();

    const current =
      ((existing as { state?: unknown } | null)?.state as CalculatorStateMap) ?? {};

    const merged: CalculatorStateMap = {
      ...current,
      [parsed.data.calculator]: {
        source: parsed.data.source,
        data: parsed.data.data,
        captured_at: new Date().toISOString(),
      },
    };

    const { error: upsertError } = await supabase
      .from("user_calculator_state")
      .upsert(
        {
          user_id: user.id,
          state: merged as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      log.warn("calculator-state POST upsert failed", {
        userId: user.id,
        error: upsertError.message,
      });
      return NextResponse.json(
        { error: "Save failed. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("calculator-state POST threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 },
    );
  }
}

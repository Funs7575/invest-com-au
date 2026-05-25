/**
 * /api/expat-plan — read & write the signed-in user's expat plan progress.
 *
 * Progress is stored in `user_calculator_state` under the key
 * `expat_plan_progress_{countryCode}` (e.g. "expat_plan_progress_uk").
 * This reuses the existing RLS-enabled table and upsert pattern from
 * /api/calculator-state, keeping the data model simple and the auth
 * surface consistent.
 *
 * Anonymous users use localStorage only (handled entirely client-side).
 * This route is only called for signed-in users.
 *
 * GET  ?country=uk   → { progress: ExpatPlanProgress | null }
 * POST body: { country: string, doneIds: string[] }
 *      → { ok: true }
 *
 * Response codes:
 *   401 = no session
 *   400 = invalid body / unknown country code
 *   429 = rate limited
 *   500 = DB write failed
 *   503 = connection error
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import { isKnownIntentCountry, type IntentCountryCode } from "@/lib/intent-context";
import { planProgressKey, type ExpatPlanProgress } from "@/lib/expat-plan";
import type { CalculatorStateMap } from "@/lib/calculator-state";
import type { Json } from "@/lib/database.types";

const log = logger("expat-plan-api");

const WriteSchema = z.object({
  country: z.string().min(2).max(4),
  doneIds: z.array(z.string().min(1).max(64)).max(20),
});

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country");

    if (!country || !isKnownIntentCountry(country)) {
      return NextResponse.json(
        { error: "Unknown country code" },
        { status: 400 },
      );
    }

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
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      log.warn("expat-plan GET failed", {
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json(
        { error: "Something went wrong. Try again in a moment." },
        { status: 500 },
      );
    }

    const stateMap =
      ((data as { state?: unknown } | null)?.state as CalculatorStateMap) ?? {};

    const key = planProgressKey(country as IntentCountryCode);
    const entry = stateMap[key];

    let progress: ExpatPlanProgress | null = null;
    if (entry?.data) {
      const raw = entry.data as { doneIds?: unknown; updatedAt?: unknown };
      const doneIds = Array.isArray(raw.doneIds)
        ? (raw.doneIds as unknown[]).filter(
            (id): id is string => typeof id === "string",
          )
        : [];
      const updatedAt =
        typeof raw.updatedAt === "string"
          ? raw.updatedAt
          : new Date(0).toISOString();
      progress = { doneIds, updatedAt };
    }

    return NextResponse.json({ progress });
  } catch (err) {
    log.error("expat-plan GET threw", {
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

    // 120/min per user — plan progress saves are lightweight but called on
    // every toggle; protects against autosave storms.
    if (await isRateLimited(`expat-plan:${user.id}`, 120, 1)) {
      return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
    }

    const json = await request.json().catch(() => null);
    const parsed = WriteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { country, doneIds } = parsed.data;

    if (!isKnownIntentCountry(country)) {
      return NextResponse.json(
        { error: "Unknown country code" },
        { status: 400 },
      );
    }

    const key = planProgressKey(country as IntentCountryCode);

    // Read-merge-write — same pattern as /api/calculator-state
    const { data: existing } = await supabase
      .from("user_calculator_state")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();

    const current =
      ((existing as { state?: unknown } | null)?.state as CalculatorStateMap) ??
      {};

    const merged: CalculatorStateMap = {
      ...current,
      [key]: {
        source: "expat-plan",
        data: { doneIds, updatedAt: new Date().toISOString() },
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
      log.warn("expat-plan POST upsert failed", {
        userId: user.id,
        country,
        error: upsertError.message,
      });
      return NextResponse.json(
        { error: "Save failed. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("expat-plan POST threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 },
    );
  }
}

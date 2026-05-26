/**
 * /api/account/life-event-wizard
 *
 * GET    ?event_id=X  — get wizard state for a specific life event
 * GET    (no params)  — list all wizard states for the user
 * POST   { life_event_id, step?, form_data? } — upsert wizard state
 * DELETE ?event_id=X  — reset wizard state (delete row)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { LIFE_EVENTS } from "@/lib/life-events";

export const runtime = "nodejs";

const VALID_IDS = new Set(LIFE_EVENTS.map((e) => e.id));

const UpsertBody = z.object({
  life_event_id: z.string().min(1).max(100),
  step: z.number().int().min(0).optional(),
  form_data: z.record(z.string(), z.unknown()).optional(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = request.nextUrl.searchParams.get("event_id");

  if (eventId) {
    if (!VALID_IDS.has(eventId)) {
      return NextResponse.json({ error: "Invalid life_event_id" }, { status: 400 });
    }
    const { data } = await supabase
      .from("life_event_wizard_state")
      .select("id, life_event_id, step, form_data, updated_at")
      .eq("user_id", user.id)
      .eq("life_event_id", eventId)
      .maybeSingle();

    return NextResponse.json({ state: data ?? null });
  }

  // List all wizard states
  const { data, error } = await supabase
    .from("life_event_wizard_state")
    .select("id, life_event_id, step, form_data, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  return NextResponse.json({ states: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(UpsertBody, async (_req: NextRequest, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { life_event_id, step = 0, form_data = {} } = body;

  if (!VALID_IDS.has(life_event_id)) {
    return NextResponse.json({ error: "Invalid life_event_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("life_event_wizard_state")
    .upsert(
      {
        user_id: user.id,
        life_event_id,
        step,
        form_data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,life_event_id" },
    )
    .select("id, life_event_id, step, form_data, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = request.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });
  if (!VALID_IDS.has(eventId)) {
    return NextResponse.json({ error: "Invalid life_event_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("life_event_wizard_state")
    .delete()
    .eq("user_id", user.id)
    .eq("life_event_id", eventId);

  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * /api/account/property-holdings — property tracker CRUD (W2 Phase 8).
 *
 * GET    — current user's properties (ordered by purchase_date DESC)
 * POST   — add a property
 * PATCH  — update a property (id required)
 * DELETE — remove a property (id required)
 *
 * RLS isolates by auth.uid(); the route uses createClient() (user-scoped)
 * so policies fire automatically.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:property-holdings");

export const runtime = "nodejs";

const STATES = ["NSW","VIC","QLD","WA","SA","TAS","NT","ACT"] as const;
const PROPERTY_TYPES = ["house","apartment","townhouse","commercial","land","rural","other"] as const;

const AddBody = z.object({
  address_line: z.string().min(1).max(200),
  suburb: z.string().max(100).nullish(),
  state: z.enum(STATES).nullish().or(z.literal("")),
  postcode: z.string().max(10).nullish(),
  purchase_price_cents: z.coerce.number().int().min(0),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  current_value_estimate_cents: z.coerce.number().int().min(0).nullish(),
  is_investment_property: z.boolean().default(false),
  weekly_rent_cents: z.coerce.number().int().min(0).nullish(),
  loan_balance_cents: z.coerce.number().int().min(0).nullish(),
  loan_rate_pct: z.coerce.number().min(0).max(99).nullish(),
  property_type: z.enum(PROPERTY_TYPES).nullish().or(z.literal("")),
  notes: z.string().max(500).nullish(),
});

const UpdateBody = AddBody.partial().extend({
  id: z.coerce.number().int().positive(),
});

const RemoveBody = z.object({
  id: z.coerce.number().int().positive(),
});

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out as T;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("property_holdings")
    .select("*")
    .order("purchase_date", { ascending: false });
  if (error) {
    log.warn("property GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cleaned = emptyToNull(body);
  const { data, error } = await supabase
    .from("property_holdings")
    .insert({ auth_user_id: user.id, ...cleaned })
    .select("*")
    .single();
  if (error) {
    log.warn("property POST failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, ...rest } = body;
  const cleaned = emptyToNull(rest);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(cleaned)) {
    if (v !== undefined) update[k] = v;
  }
  const { data, error } = await supabase
    .from("property_holdings")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    log.warn("property PATCH failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
});

export const DELETE = withValidatedBody(RemoveBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("property_holdings")
    .delete()
    .eq("id", body.id);
  if (error) {
    log.warn("property DELETE failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

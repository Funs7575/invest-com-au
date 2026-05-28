/**
 * /api/account/term-deposits — user_term_deposits CRUD.
 *
 * GET    — current user's term deposits (ordered by maturity_date ASC)
 * POST   — add a term deposit
 * PATCH  — update a term deposit (id required)
 * DELETE — remove a term deposit (id required)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:term-deposits");

export const runtime = "nodejs";

const AddBody = z.object({
  institution_name: z.string().min(1).max(120),
  provider_slug: z.string().max(80).default(""),
  principal_cents: z.coerce.number().int().min(100),
  rate_bps: z.coerce.number().int().min(0).max(5000),
  term_months: z.coerce.number().int().min(1).max(120),
  maturity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).default(""),
});

const UpdateBody = AddBody.partial().extend({
  id: z.coerce.number().int().positive(),
});

const RemoveBody = z.object({
  id: z.coerce.number().int().positive(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_term_deposits")
    .select("*")
    .order("maturity_date", { ascending: true });
  if (error) {
    log.warn("GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_term_deposits")
    .insert({ user_id: user.id, ...body })
    .select("*")
    .single();
  if (error) {
    log.warn("POST failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, ...rest } = body;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) update[k] = v;
  }

  const { data, error } = await supabase
    .from("user_term_deposits")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    log.warn("PATCH failed", { userId: user.id, id, error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ item: data });
});

export const DELETE = withValidatedBody(RemoveBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("user_term_deposits")
    .delete()
    .eq("id", body.id);
  if (error) {
    log.warn("DELETE failed", { userId: user.id, id: body.id, error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

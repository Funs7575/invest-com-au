import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { awardIfEligible } from "@/lib/quests-server";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings");

export const runtime = "nodejs";

/**
 * /api/account/holdings — investor manual-holdings CRUD.
 *
 *   GET    — authenticated user's holdings (RLS scopes to own rows)
 *   POST   — add a holding
 *   PATCH  — update a holding (id required)
 *   DELETE — remove a holding (id required)
 *
 * RLS does the heavy lifting (deny-all anonymous; user reads/writes own
 * rows only). The handler still uses the user-scoped supabase client so
 * the policies fire, never service-role.
 */

const EXCHANGES = ["ASX","NASDAQ","NYSE","LSE","HKEX","SGX","TYO","KRX","CRYPTO","OTHER"] as const;

const AddHoldingBody = z.object({
  ticker: z.string().min(1).max(30),
  exchange: z.enum(EXCHANGES),
  shares: z.coerce.number().positive().max(1e12),
  cost_basis_per_share_cents: z.coerce.number().int().min(0).max(1e15),
  acquired_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD required"),
  broker_slug: z.string().max(100).nullish(),
  notes: z.string().max(500).nullish(),
});

const UpdateHoldingBody = AddHoldingBody.partial().extend({
  id: z.coerce.number().int().positive(),
});

const RemoveHoldingBody = z.object({
  id: z.coerce.number().int().positive(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("investor_holdings")
    .select("id, ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug, notes, created_at, updated_at")
    .order("acquired_at", { ascending: false });

  if (error) {
    log.warn("holdings fetch failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddHoldingBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("investor_holdings")
    .insert({
      auth_user_id: user.id,
      ticker: body.ticker.trim().toUpperCase(),
      exchange: body.exchange,
      shares: body.shares,
      cost_basis_per_share_cents: body.cost_basis_per_share_cents,
      acquired_at: body.acquired_at,
      broker_slug: body.broker_slug ?? null,
      notes: body.notes ?? null,
    })
    .select("id, ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug, notes, created_at, updated_at")
    .single();

  if (error) {
    log.warn("holdings insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }

  // Quests: first-holding (always) + three-holdings (threshold). Both
  // fire-and-forget; flag-gated + fail-soft inside awardIfEligible, so a
  // failed award never affects the holding insert response.
  void (async () => {
    void awardIfEligible(user.id, "first-holding");
    const { count } = await supabase
      .from("investor_holdings")
      .select("id", { count: "exact", head: true });
    if (typeof count === "number") {
      void awardIfEligible(user.id, "three-holdings", { count, meta: { holdings_count: count } });
    }
  })().catch(() => {
    /* fail-soft: award bookkeeping must never break the host action */
  });

  return NextResponse.json({ item: data }, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateHoldingBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, ...rest } = body;
  // Prepare clean update payload; drop undefined fields so PATCH is true-partial.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.ticker !== undefined) update.ticker = rest.ticker.trim().toUpperCase();
  if (rest.exchange !== undefined) update.exchange = rest.exchange;
  if (rest.shares !== undefined) update.shares = rest.shares;
  if (rest.cost_basis_per_share_cents !== undefined) update.cost_basis_per_share_cents = rest.cost_basis_per_share_cents;
  if (rest.acquired_at !== undefined) update.acquired_at = rest.acquired_at;
  if (rest.broker_slug !== undefined) update.broker_slug = rest.broker_slug;
  if (rest.notes !== undefined) update.notes = rest.notes;

  const { data, error } = await supabase
    .from("investor_holdings")
    .update(update)
    .eq("id", id)
    .select("id, ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug, notes, created_at, updated_at")
    .single();

  if (error) {
    log.warn("holdings update failed", { error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
});

export const DELETE = withValidatedBody(RemoveHoldingBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("investor_holdings")
    .delete()
    .eq("id", body.id);

  if (error) {
    log.warn("holdings delete failed", { error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

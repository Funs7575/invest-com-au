/**
 * /api/account/business — business_accounts CRUD (W2 Phase 3).
 *
 * GET    — current user's business profile (or null)
 * POST   — create profile (status='pending'); upserts on auth_user_id
 * PATCH  — update profile (any subset of fields)
 *
 * RLS does the heavy lifting: per-user policies on business_accounts
 * scope reads/writes to auth.uid(). The handler uses createClient()
 * (user-scoped) so policies fire automatically.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:business");

export const runtime = "nodejs";

const EMPLOYEES_BANDS = ["1", "2-4", "5-19", "20-199", "200+"] as const;
const REVENUE_BANDS = ["under_75k", "75k_2m", "2m_10m", "10m_50m", "50m_plus"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"] as const;

const Body = z.object({
  business_name: z.string().min(1).max(200),
  legal_name: z.string().max(200).nullish(),
  abn: z.string().regex(/^\d{11}$/).nullish().or(z.literal("")),
  acn: z.string().regex(/^\d{9}$/).nullish().or(z.literal("")),
  industry: z.string().max(100).nullish(),
  employees_band: z.enum(EMPLOYEES_BANDS).nullish().or(z.literal("")),
  revenue_band: z.enum(REVENUE_BANDS).nullish().or(z.literal("")),
  primary_state: z.enum(STATES).nullish().or(z.literal("")),
  year_established: z.coerce.number().int().min(1850).max(2100).nullish(),
});

const PatchBody = Body.partial();

function normaliseEmptyToNull<T extends Record<string, unknown>>(obj: T): T {
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
    .from("business_accounts")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) {
    log.warn("business GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ account: data ?? null });
}

export const POST = withValidatedBody(Body, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cleaned = normaliseEmptyToNull(body);
  const { data, error } = await supabase
    .from("business_accounts")
    .upsert(
      {
        auth_user_id: user.id,
        ...cleaned,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" },
    )
    .select("*")
    .single();
  if (error) {
    log.warn("business POST failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ account: data }, { status: 201 });
});

export const PATCH = withValidatedBody(PatchBody, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cleaned = normaliseEmptyToNull(body);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(cleaned)) {
    if (v !== undefined) update[k] = v;
  }

  const { data, error } = await supabase
    .from("business_accounts")
    .update(update)
    .eq("auth_user_id", user.id)
    .select("*")
    .single();
  if (error) {
    log.warn("business PATCH failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ account: data });
});

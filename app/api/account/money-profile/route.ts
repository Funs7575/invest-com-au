/**
 * /api/account/money-profile — the user's assembled Money Profile.
 *
 * GET   — assembled profile (editable meta fields + derived balances) and
 *         coverage stats. Powers `useMoneyProfile()` prefill across
 *         calculators and the dashboard coverage card.
 * PATCH — update the self-declared fields (state, age, income, monthly
 *         savings, target retirement age). Derived fields are read-only
 *         here by design: their sources of truth are /account/net-worth,
 *         /account/holdings and the fee profile.
 *
 * Auth: Supabase session required; reads run on the user-scoped client so
 * RLS owner policies authorise them.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  loadMoneyProfileForUser,
  moneyProfileCoverage,
  saveMoneyMeta,
  MONEY_STATES,
  type MoneyProfileQueryClient,
} from "@/lib/money-profile";
import { logger } from "@/lib/logger";

const log = logger("api:account:money-profile");

export const runtime = "nodejs";

const Body = z.object({
  state: z.enum(MONEY_STATES).nullish().or(z.literal("")),
  age: z.number().int().min(16).max(100).nullish(),
  annual_income: z.number().int().min(0).max(100_000_000).nullish(),
  monthly_savings: z.number().int().min(0).max(1_000_000).nullish(),
  target_retirement_age: z.number().int().min(40).max(90).nullish(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const profile = await loadMoneyProfileForUser(
      user.id,
      supabase as unknown as MoneyProfileQueryClient,
    );
    return NextResponse.json({ profile, coverage: moneyProfileCoverage(profile) });
  } catch (err) {
    log.error("money-profile GET failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export const PATCH = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // "" → null (clear); undefined keys are left untouched by saveMoneyMeta.
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    patch[k] = v === "" ? null : v;
  }

  const ok = await saveMoneyMeta(user.id, patch);
  if (!ok) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  const profile = await loadMoneyProfileForUser(
    user.id,
    supabase as unknown as MoneyProfileQueryClient,
  );
  return NextResponse.json({
    success: true,
    profile,
    coverage: moneyProfileCoverage(profile),
  });
});

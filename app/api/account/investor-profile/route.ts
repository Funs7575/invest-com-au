/**
 * /api/account/investor-profile — investor_profiles CRUD (W2 Phase 2 follow-up).
 *
 * GET   — current user's investor profile (or null)
 * PATCH — update typed columns (life-event flags + ranker inputs + display_name)
 *
 * Lives alongside the syncQuizToInvestorProfile path: quizzes auto-populate
 * the row; this route lets users override / refine those values directly.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { upsertInvestorProfile, getInvestorProfile } from "@/lib/investor-profiles";
import { awardIfEligible } from "@/lib/quests-server";
import { logger } from "@/lib/logger";

const log = logger("api:account:investor-profile");

export const runtime = "nodejs";

const COUNTRY_CODES = ["uk","us","cn","in","jp","sg","hk","kr","my","nz","ae","sa"] as const;
const BUDGET_BANDS = ["small","medium","large","whale"] as const;
const EXPERIENCE_LEVELS = ["beginner","intermediate","pro"] as const;

const Body = z.object({
  display_name: z.string().max(120).nullish(),
  is_fhb: z.boolean().optional(),
  is_pre_retiree: z.boolean().optional(),
  is_business_owner: z.boolean().optional(),
  is_cross_border: z.boolean().optional(),
  is_hnw: z.boolean().optional(),
  intent_country_snapshot: z.enum(COUNTRY_CODES).nullish().or(z.literal("")),
  budget_band: z.enum(BUDGET_BANDS).nullish().or(z.literal("")),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullish().or(z.literal("")),
  primary_vertical: z.string().max(50).nullish(),
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

  const profile = await getInvestorProfile(user.id);
  return NextResponse.json({ profile });
}

export const PATCH = withValidatedBody(Body, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cleaned = emptyToNull(body);
  // Filter out undefined keys so we only patch what was sent.
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cleaned)) {
    if (v !== undefined) patch[k] = v;
  }

  const ok = await upsertInvestorProfile(user.id, patch);
  if (!ok) {
    log.warn("investor-profile PATCH failed", { userId: user.id });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  const fresh = await getInvestorProfile(user.id);
  // Quest: complete-your-profile. Fire-and-forget — flag-gated + fail-soft
  // inside; an award failure must never affect the profile save.
  void awardIfEligible(user.id, "complete-your-profile");
  return NextResponse.json({ profile: fresh });
});

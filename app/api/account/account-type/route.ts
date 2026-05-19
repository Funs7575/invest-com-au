/**
 * /api/account/account-type — investor household type.
 *
 * GET  — returns current account_type from investor_profiles.meta (default: "individual")
 * PUT  — sets account_type, merging into existing meta so other keys (e.g. digest prefs) survive
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile, upsertInvestorProfile } from "@/lib/investor-profiles";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { getInvestorAccountType } from "@/lib/account-types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:account:account-type");

const Body = z.object({
  account_type: z.enum(["individual", "couple", "family", "business"]),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getInvestorProfile(user.id);
  const account_type = getInvestorAccountType({
    household_type: profile?.householdType,
    meta: profile?.meta ?? {},
  });
  return NextResponse.json({ account_type });
}

export const PUT = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getInvestorProfile(user.id);
  // Dual-write: typed column is source of truth (Phase 2.2), meta JSON
  // keeps the value for one release as a fallback for any in-flight
  // reader still on the JSON path. Remove the meta merge in a follow-up.
  const mergedMeta: Record<string, unknown> = { ...(profile?.meta ?? {}) };
  mergedMeta.account_type = body.account_type;

  const ok = await upsertInvestorProfile(user.id, {
    household_type: body.account_type,
    meta: mergedMeta,
  });
  if (!ok) {
    log.warn("account-type PUT failed", { userId: user.id });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ account_type: body.account_type });
});

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
  const account_type = getInvestorAccountType(profile?.meta ?? {});
  return NextResponse.json({ account_type });
}

export const PUT = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getInvestorProfile(user.id);
  const mergedMeta: Record<string, unknown> = { ...(profile?.meta ?? {}) };
  mergedMeta.account_type = body.account_type;

  const ok = await upsertInvestorProfile(user.id, { meta: mergedMeta });
  if (!ok) {
    log.warn("account-type PUT failed", { userId: user.id });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ account_type: body.account_type });
});

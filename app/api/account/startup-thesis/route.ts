import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { upsertInvestorProfile } from "@/lib/investor-profiles";
import { logger } from "@/lib/logger";

const log = logger("api:account:startup-thesis");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTOR_TAGS = [
  "fintech","healthtech","saas","deeptech","cleantech","edtech",
  "proptech","agritech","govtech","legaltech","insurtech","cybersecurity",
  "ai_ml","biotech","ecommerce","marketplace","consumer","hardware","other",
] as const;

const STAGES = ["pre_seed","seed","series_a","series_b_plus"] as const;
const GEOS = ["australia","new_zealand","southeast_asia","us","uk","other"] as const;

const ThesisBody = z.object({
  sector_tags: z.array(z.enum(SECTOR_TAGS)).max(10).optional(),
  stage_preferences: z.array(z.enum(STAGES)).max(4).optional(),
  min_ticket_aud: z.number().int().min(0).nullish(),
  max_ticket_aud: z.number().int().min(0).nullish(),
  geography: z.array(z.enum(GEOS)).max(6).optional(),
});

export type StartupThesis = z.infer<typeof ThesisBody>;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS allows user to read own investor_profiles row
  const { data } = await supabase
    .from("investor_profiles")
    .select("meta")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const meta = (data?.meta as Record<string, unknown> | null) ?? {};
  const thesis = (meta.startup_thesis as StartupThesis | undefined) ?? null;

  return NextResponse.json({ thesis });
}

export const PUT = withValidatedBody(ThesisBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read current meta so we merge rather than overwrite other keys
  const { data } = await supabase
    .from("investor_profiles")
    .select("meta")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const currentMeta = (data?.meta as Record<string, unknown> | null) ?? {};
  const mergedMeta = { ...currentMeta, startup_thesis: body };

  const ok = await upsertInvestorProfile(user.id, { meta: mergedMeta });
  if (!ok) {
    log.warn("startup-thesis PUT failed", { userId: user.id });
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ thesis: body });
});

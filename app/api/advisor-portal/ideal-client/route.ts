import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

export const runtime = "nodejs";

const VALID_VERTICALS = ["property", "etf", "shares", "crypto", "bonds", "smsf", "insurance", "superannuation", "mortgage", "business"] as const;
const VALID_BUDGETS = ["under_100k", "100k_250k", "250k_500k", "500k_1m", "1m_5m", "5m_plus"] as const;
const VALID_ARCHETYPES = ["fhb", "hnw", "pre_retiree", "business_owner"] as const;
const VALID_EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;

const CriteriaBody = z.object({
  verticals: z.array(z.enum(VALID_VERTICALS)).max(10).optional(),
  budget_bands: z.array(z.enum(VALID_BUDGETS)).max(6).optional(),
  archetypes: z.array(z.enum(VALID_ARCHETYPES)).max(4).optional(),
  experience_levels: z.array(z.enum(VALID_EXPERIENCE)).max(3).optional(),
  description: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const professionalId = await requireAdvisorSession(req);
  if (!professionalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_ideal_clients")
    .select("criteria, updated_at")
    .eq("professional_id", professionalId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  return NextResponse.json({
    criteria: data?.criteria ?? null,
    updated_at: (data as { updated_at?: string } | null)?.updated_at ?? null,
    meta: {
      valid_verticals: VALID_VERTICALS,
      valid_budget_bands: VALID_BUDGETS,
      valid_archetypes: VALID_ARCHETYPES,
      valid_experience_levels: VALID_EXPERIENCE,
    },
  });
}

export const PUT = withValidatedBody(CriteriaBody, async (req: NextRequest, body) => {
  const professionalId = await requireAdvisorSession(req);
  if (!professionalId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("advisor_ideal_clients")
    .upsert(
      {
        professional_id: professionalId,
        criteria: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "professional_id" },
    );

  if (error) return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  return NextResponse.json({ success: true, criteria: body });
});
